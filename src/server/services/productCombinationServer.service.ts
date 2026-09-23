import { normalize, truncateQty } from "@/lib/compute";
import { getMappedProductComboName } from "@/lib/mapped";
import { getSKU } from "@/lib/string";
import {
  BreakPackInput,
  ProductCombinationUpdate,
  StockAdjustmentInput,
  stockAdjustmentInputSchema,
} from "@/schemas";
import sequelize from "@/server/db/sequelize";
import {
  BreakPack,
  Inventory,
  PriceHistory,
  Product,
  ProductCombination,
  StockAdjustment,
  VariantType,
  VariantValue,
} from "@/server/models";
import { QueryTypes } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { inventoryServerService } from "./inventoryServer.service";
import { productServerService } from "./productServer.service";

export interface SearchProductCombinationsInput {
  search: string;
  noBreakPacks?: boolean | string | null;
  limit?: number;
}

export interface CombinationItemInput {
  id?: number | string;
  name?: string;
  sku?: string;
  barcode?: string | null;
  unit?: string;
  price?: number;
  costPrice?: number;
  conversionFactor?: number;
  isBreakPack?: boolean;
  isBreakPackOfId?: number | string | null;
  values?: any[];
  [key: string]: any;
}

export interface UpdateProductCombinationsInput {
  combinations?: CombinationItemInput[];
  userId?: number;
}

export interface BreakPackPayload {
  fromCombinationId: number;
  toCombinationId: number;
  quantity: number;
  userId: number;
}

export interface StockAdjustmentPayload {
  combinationId: number;
  newQuantity: number;
  reason: string;
  notes?: string | null;
  userId?: number;
}

export interface UpdatePriceItem {
  id: number | string;
  newPrice: number;
  userId?: number;
}

const getIncludes = [
  {
    model: VariantValue,
    as: "values",
    through: { attributes: [] },
  },
  {
    model: Product,
    as: "product",
    include: [{ model: VariantType, as: "variants" }],
  },
  {
    model: Inventory,
    as: "inventory",
  },
];

export const productCombinationServerService = {
  buildTsQuery,

  get: async (id: number | string) => {
    const productCombination = await ProductCombination.findByPk(Number(id), {
      include: [...getIncludes],
      order: [
        [
          { model: Product, as: "product" },
          { model: VariantType, as: "variants" },
          "name",
          "ASC",
        ],
      ],
    });

    if (!productCombination) {
      throw new Error("Product combination not found");
    }

    return productCombination;
  },

  getByProductId: async (id: number | string) => {
    const combinations = await ProductCombination.findAll({
      where: { productId: Number(id) },
      include: [
        {
          model: VariantValue,
          as: "values",
          through: { attributes: [] },
        },
        {
          model: Inventory,
          as: "inventory",
        },
      ],
      order: [
        ["name", "ASC"],
        ["isBreakPackOfId", "ASC NULLS FIRST"],
      ],
    });

    const variants = await VariantType.findAll({
      where: { productId: Number(id) },
      order: [
        ["name", "ASC"],
        [{ model: VariantValue, as: "values" }, "value", "ASC"],
      ],
      include: [
        {
          model: VariantValue,
          as: "values",
        },
      ],
    });

    return {
      combinations,
      variants,
    };
  },

  getByBarcode: async (barcode: string) => {
    const productCombination = await ProductCombination.findOne({
      where: { barcode },
      include: [...getIncludes],
      order: [
        [
          { model: Product, as: "product" },
          { model: VariantType, as: "variants" },
          "name",
          "ASC",
        ],
      ],
    });

    if (!productCombination) {
      throw new Error("Product combination not found");
    }

    return productCombination;
  },

  // create: async (
  //   payload: CombinationItemInput & { productId: number; userId?: number },
  // ) => {
  //   const numProductId = Number(payload.productId);
  //   const product = await Product.findByPk(numProductId, {
  //     include: [
  //       {
  //         model: ProductCombination,
  //         as: "combinations",
  //         include: [
  //           {
  //             model: VariantValue,
  //             as: "values",
  //             through: { attributes: [] },
  //           },
  //         ],
  //       },
  //       {
  //         model: VariantType,
  //         as: "variants",
  //         include: [{ model: VariantValue, as: "values" }],
  //       },
  //     ],
  //     order: [[{ model: VariantType, as: "variants" }, "name", "ASC"]],
  //   });

  //   if (!product) {
  //     throw new Error("Product not found");
  //   }

  //   validateCombinations([payload], product);
  //   if (payload.isBreakPackOfId) {
  //     await validateVariants(payload, product);
  //   }

  //   return await sequelize.transaction(async (transaction) => {
  //     const variantValueIds = await getVariantValueIds(
  //       numProductId,
  //       payload.values || [],
  //       transaction,
  //     );
  //     if (variantValueIds.length !== (payload.values || []).length) {
  //       throw new Error("Some variant values are invalid or missing");
  //     }

  //     const computedName =
  //       payload.name ||
  //       getMappedProductComboName(product, payload.values || []);
  //     const computedSku =
  //       payload.sku ||
  //       getSKU(
  //         (product as any).name || "Product",
  //         (product as any).categoryId || 1,
  //         payload.unit || (product as any).baseUnit || "PCS",
  //         payload.values || [],
  //       );

  //     const combination = await ProductCombination.create(
  //       {
  //         ...payload,
  //         unit: payload.unit || (product as any).baseUnit || "PCS",
  //         productId: numProductId,
  //         name: computedName,
  //         sku: computedSku,
  //       } as any,
  //       { transaction },
  //     );

  //     if (
  //       typeof (combination as any).setValues === "function" &&
  //       variantValueIds.length > 0
  //     ) {
  //       await (combination as any).setValues(variantValueIds, { transaction });
  //     }

  //     await Inventory.findOrCreate({
  //       where: { combinationId: combination.id },
  //       defaults: {
  //         combinationId: combination.id,
  //         quantity: 0,
  //       },
  //       transaction,
  //     });

  //     return combination;
  //   });
  // },

  // update: async (
  //   payload: CombinationItemInput & {
  //     id: number | string;
  //     productId: number;
  //     userId?: number;
  //   },
  // ) => {
  //   const numId = Number(payload.id);
  //   const numProductId = Number(payload.productId);
  //   const userId = payload.userId;

  //   const product = await Product.findByPk(numProductId, {
  //     include: [
  //       {
  //         model: ProductCombination,
  //         as: "combinations",
  //         include: [
  //           {
  //             model: VariantValue,
  //             as: "values",
  //             through: { attributes: [] },
  //           },
  //         ],
  //       },
  //       {
  //         model: VariantType,
  //         as: "variants",
  //         include: [{ model: VariantValue, as: "values" }],
  //       },
  //     ],
  //     order: [[{ model: VariantType, as: "variants" }, "name", "ASC"]],
  //   });

  //   if (!product) {
  //     throw new Error("Product not found");
  //   }

  //   validateCombinations([payload], product);

  //   return await sequelize.transaction(async (transaction) => {
  //     const combination = await ProductCombination.findOne({
  //       where: { id: numId, productId: numProductId },
  //       transaction,
  //     });

  //     if (!combination) {
  //       throw new Error(`Combination with ID ${numId} not found`);
  //     }

  //     if (
  //       payload.price !== undefined &&
  //       normalize(payload.price) !== normalize(combination.price ?? 0)
  //     ) {
  //       await PriceHistory.create(
  //         {
  //           productId: numProductId,
  //           combinationId: combination.id,
  //           fromPrice: combination.price ?? 0,
  //           toPrice: normalize(payload.price),
  //           changedBy: userId,
  //           changedAt: new Date(),
  //         },
  //         { transaction },
  //       );
  //     }

  //     const computedName =
  //       payload.name ||
  //       getMappedProductComboName(product, payload.values || []);
  //     const computedSku =
  //       payload.sku ||
  //       getSKU(
  //         (product as any).name || "Product",
  //         (product as any).categoryId || 1,
  //         payload.unit || (product as any).baseUnit || "PCS",
  //         payload.values || [],
  //       );

  //     await combination.update(
  //       {
  //         ...payload,
  //         name: computedName,
  //         sku: computedSku,
  //       } as any,
  //       { transaction },
  //     );

  //     const variantValueIds = await getVariantValueIds(
  //       numProductId,
  //       payload.values || [],
  //       transaction,
  //     );

  //     if (variantValueIds.length !== (payload.values || []).length) {
  //       throw new Error("Some variant values are invalid or missing");
  //     }

  //     if (
  //       typeof (combination as any).setValues === "function" &&
  //       variantValueIds.length > 0
  //     ) {
  //       await (combination as any).setValues(variantValueIds, { transaction });
  //     }

  //     return combination;
  //   });
  // },

  // getByProductId: async (productId: number | string) => {
  //   const combinations = await ProductCombination.findAll({
  //     where: { productId: Number(productId) },
  //     include: [
  //       {
  //         model: VariantValue,
  //         as: "values",
  //         through: { attributes: [] },
  //       },
  //       {
  //         model: Inventory,
  //         as: "inventory",
  //       },
  //     ],
  //     order: [
  //       ["name", "ASC"],
  //       ["isBreakPackOfId", "ASC NULLS FIRST"],
  //     ],
  //   });

  //   const variants = await VariantType.findAll({
  //     where: { productId: Number(productId) },
  //     order: [
  //       ["name", "ASC"],
  //       [{ model: VariantValue, as: "values" }, "value", "ASC"],
  //     ],
  //     include: [
  //       {
  //         model: VariantValue,
  //         as: "values",
  //       },
  //     ],
  //   });

  //   return {
  //     combinations,
  //     variants,
  //   };
  // },

  // getByCategoryId: async (categoryId: number | string) => {
  //   const combinations = await ProductCombination.findAll({
  //     include: [
  //       {
  //         model: Product,
  //         as: "product",
  //         where: { categoryId: Number(categoryId) },
  //       },
  //       {
  //         model: Inventory,
  //         as: "inventory",
  //       },
  //     ],
  //     order: [[{ model: Product, as: "product" }, "name", "ASC"]],
  //     where: {
  //       isActive: true,
  //     },
  //   });

  //   return combinations;
  // },

  updateByProductId: async (
    productId: number | string,
    combinations: ProductCombinationUpdate[],
    userId: number = 1,
  ) => {
    const numProductId = Number(productId);
    try {
      return await sequelize.transaction(async (transaction) => {
        const product = await Product.findByPk(numProductId, {
          include: [
            {
              model: VariantType,
              as: "variants",
              include: [{ model: VariantValue, as: "values" }],
            },
          ],
          transaction,
        });

        if (!product) {
          throw new Error("Product not found");
        }

        const incomingCombinations = combinations || [];
        const existingCombinations = await ProductCombination.findAll({
          where: { productId: numProductId },
          include: [
            { model: Inventory, as: "inventory" },
            {
              model: VariantValue,
              as: "values",
              through: { attributes: [] },
            },
          ],
          transaction,
        });

        validateCombinations(incomingCombinations, product);

        const existingMap = new Map<number, ProductCombination>(
          existingCombinations.map((comb) => [Number(comb.id), comb]),
        );

        const incomingIds = new Set(
          incomingCombinations
            .map((c) =>
              c.id !== undefined && c.id !== null ? Number(c.id) : null,
            )
            .filter((id): id is number => id !== null && !isNaN(id)),
        );

        const deleteCandidates = existingCombinations.filter(
          (comb) => !incomingIds.has(Number(comb.id)),
        );
        const blockedIds = deleteCandidates
          .filter(
            (comb: any) =>
              comb.inventory && Number(comb.inventory.quantity) > 0,
          )
          .map((comb) => comb.id);

        if (blockedIds.length > 0) {
          throw new Error(
            `Cannot delete combinations with inventory > 0: ${blockedIds.join(", ")}`,
          );
        }

        const deletableIds = deleteCandidates.map((comb) => comb.id);
        if (deletableIds.length > 0) {
          await ProductCombination.destroy({
            where: { id: deletableIds },
            transaction,
          });
        }

        for (const combo of incomingCombinations) {
          const comboId =
            combo.id !== undefined && combo.id !== null
              ? Number(combo.id)
              : null;

          const variantValueIds = await getVariantValueIds(
            numProductId,
            combo.values || [],
            transaction,
          );

          if (variantValueIds.length !== (combo.values || []).length) {
            throw new Error("Some variant values are invalid or missing");
          }

          const computedName =
            combo.name ||
            getMappedProductComboName(product, combo.values || []);
          const computedSku = getSKU(
            (product as any).name || "Product",
            (product as any).categoryId || 1,
            combo.unit || (product as any).baseUnit || "PCS",
            combo.values || [],
          );

          let combination: ProductCombination;

          if (comboId !== null) {
            if (!existingMap.has(comboId)) {
              throw new Error(`Combination with ID ${comboId} not found`);
            }

            const existing = existingMap.get(comboId)!;

            if (
              combo.price !== undefined &&
              normalize(combo.price ?? 0) !== normalize(existing.price ?? 0)
            ) {
              await PriceHistory.create(
                {
                  productId: numProductId,
                  combinationId: existing.id,
                  fromPrice: existing.price ?? 0,
                  toPrice: normalize(combo.price ?? 0),
                  changedBy: userId,
                  changedAt: new Date(),
                },
                { transaction },
              );
            }

            await existing.update(
              {
                ...combo,
                name: computedName,
                sku: computedSku,
                productId: numProductId,
              } as any,
              { transaction },
            );
            combination = existing;

            if (typeof (combination as any).setValues === "function") {
              await (combination as any).setValues(variantValueIds, {
                transaction,
              });
            }
          } else {
            combination = await ProductCombination.create(
              {
                ...combo,
                unit: combo.unit || (product as any).baseUnit || "PCS",
                name: computedName,
                sku: computedSku,
                productId: numProductId,
              } as any,
              { transaction },
            );

            if (
              typeof (combination as any).setValues === "function" &&
              variantValueIds.length > 0
            ) {
              await (combination as any).setValues(variantValueIds, {
                transaction,
              });
            } else if (
              typeof (combination as any).addValues === "function" &&
              variantValueIds.length > 0
            ) {
              await (combination as any).addValues(variantValueIds, {
                transaction,
              });
            }
          }

          await Inventory.findOrCreate({
            where: { combinationId: combination.id },
            defaults: {
              combinationId: combination.id,
              quantity: 0,
            },
            transaction,
          });
        }

        await productServerService.syncCombinationNames(
          numProductId,
          transaction,
        );
        await productServerService.rebuildProductSearchText(
          numProductId,
          transaction,
        );

        return {
          success: true,
          message: "Product combinations updated successfully",
        };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  // delete: async (id: number | string) => {
  //   const numId = Number(id);
  //   return await sequelize.transaction(async (transaction) => {
  //     const combination = await ProductCombination.findByPk(numId, {
  //       include: [
  //         {
  //           model: Inventory,
  //           as: "inventory",
  //         },
  //       ],
  //       transaction,
  //     });

  //     if (!combination) {
  //       throw new Error(`Combination with ID ${numId} not found`);
  //     }

  //     if (
  //       (combination as any).inventory &&
  //       Number((combination as any).inventory.quantity) > 0
  //     ) {
  //       throw new Error("Combination has inventory");
  //     }

  //     const breakPack = await ProductCombination.findAll({
  //       where: {
  //         isBreakPackOfId: numId,
  //       },
  //       transaction,
  //     });

  //     if (breakPack.length > 0) {
  //       throw new Error(
  //         "Combination has break pack. Please remove break pack before deleting this combination",
  //       );
  //     }

  //     await combination.destroy({ transaction });
  //     return true;
  //   });
  // },

  search: async (query: SearchProductCombinationsInput) => {
    const { search, noBreakPacks = null, limit = 50 } = query;
    const tsQuery = buildTsQuery(search);

    const words = (search || "")
      .trim()
      .toLowerCase()
      .replace(/['"#]/g, "")
      .split(/[\s,;&|!():*\-]+/)
      .filter((w) => w.length > 0 && w !== "-");

    const noBreakPacksVal =
      noBreakPacks === true || noBreakPacks === "true" ? true : null;

    const replacements: Record<string, any> = {
      tsQuery: tsQuery || "a",
      limit: limit || 50,
      noBreakPacks: noBreakPacksVal,
    };

    let wordClause = "";
    if (words.length > 0) {
      const conditions = words.map((w, i) => {
        const paramKey = `word${i}`;
        replacements[paramKey] = `%${w}%`;
        return `(p.name ILIKE :${paramKey} OR p.description ILIKE :${paramKey} OR pc.name ILIKE :${paramKey} OR pc.sku ILIKE :${paramKey})`;
      });
      wordClause = `OR (${conditions.join(" AND ")})`;
    } else {
      replacements.likeQuery = `%${search || ""}%`;
      wordClause = `OR (p.name ILIKE :likeQuery OR p.description ILIKE :likeQuery OR pc.name ILIKE :likeQuery OR pc.sku ILIKE :likeQuery)`;
    }

    const results = await sequelize.query(
      `
SELECT
  p.id,
  p.name,
  p.description,
  p."categoryId",
  pc."unit",
  
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', pc.id,
        'productId', pc."productId",
        'name', pc.name,
        'sku', pc.sku,
        'unit', pc.unit,
        'price', pc.price,
        'inventory', inv."Inventory"
      )
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'
  ) AS "combinations"
FROM "Products" p
LEFT JOIN "ProductCombinations" pc
  ON pc."productId" = p.id
  AND pc."deletedAt" IS NULL
  AND (
    :noBreakPacks IS NULL
    OR pc."isBreakPack" = false
  )

LEFT JOIN LATERAL (
  SELECT
    jsonb_build_object(
      'id', i.id,
      'quantity', i.quantity,
      'averagePrice', i."averagePrice",
      'combinationId', i."combinationId"
    ) AS "Inventory"
  FROM "Inventories" i
  WHERE i."combinationId" = pc.id
    AND i."deletedAt" IS NULL
  LIMIT 1
) inv ON true

WHERE
  p."deletedAt" IS NULL
  AND (
    (p.search_text IS NOT NULL AND p.search_text @@ to_tsquery('simple', :tsQuery))
    ${wordClause}
  )

GROUP BY p.id, p.name, pc."unit"
ORDER BY p.name
LIMIT :limit;
`,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    return results;
  },

  searchSuggestion: async (
    search?: string | null,
    unit?: string | null,
    price?: number | string | null,
  ) => {
    if (!search || typeof search !== "string") return [];

    const words = search
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .split(/[\s,;&|!():*\-]+/)
      .filter((word) => word.length > 0 && word !== "-");

    if (words.length === 0) return [];

    const queryWords = words.filter(
      (w) => w.replace(/[^a-z0-9]/g, "").length > 1,
    );
    const wordsForQuery = queryWords.length > 0 ? queryWords : words;

    let tsQuery = words.map((w) => `${w}:*`).join(" & ");
    const ilikeConditionsOr = wordsForQuery
      .map((_, i) => `p.search_text::text ILIKE :word${i}`)
      .join(" OR ");

    const replacements: Record<string, any> = { tsQuery };
    wordsForQuery.forEach((w, i) => {
      replacements[`word${i}`] = `%${w}%`;
    });

    let results: any[] = [];
    try {
      results = await sequelize.query(
        `
SELECT
  p.id,
  p.name,
  p.description,
  p."categoryId",
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', pc.id,
        'productId', pc."productId",
        'name', pc.name,
        'sku', pc.sku,
        'unit', pc.unit,
        'price', pc.price,
        'inventory', inv."Inventory"
      )
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'
  ) AS "combinations",
  ts_rank(p.search_text, to_tsquery('simple', :tsQuery)) as rank
FROM "Products" p
LEFT JOIN "ProductCombinations" pc
  ON pc."productId" = p.id
  AND pc."deletedAt" IS NULL
LEFT JOIN LATERAL (
  SELECT
    jsonb_build_object(
      'id', i.id,
      'quantity', i.quantity,
      'averagePrice', i."averagePrice"
    ) AS "Inventory"
  FROM "Inventories" i
  WHERE i."combinationId" = pc.id
    AND i."deletedAt" IS NULL
  LIMIT 1
) inv ON true
WHERE
  p."deletedAt" IS NULL
  AND (
    (p.search_text IS NOT NULL AND p.search_text @@ to_tsquery('simple', :tsQuery))
    ${ilikeConditionsOr ? `OR (${ilikeConditionsOr})` : ""}
  )
GROUP BY p.id, p.name, rank
ORDER BY rank DESC
LIMIT 100;
`,
        {
          replacements,
          type: QueryTypes.SELECT,
        },
      );
    } catch {
      results = [];
    }

    if (results.length === 0) {
      try {
        tsQuery = wordsForQuery.map((w) => `${w}:*`).join(" | ");
        replacements.tsQuery = tsQuery;

        results = await sequelize.query(
          `
SELECT
  p.id,
  p.name,
  p.description,
  p."categoryId",
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', pc.id,
        'productId', pc."productId",
        'name', pc.name,
        'sku', pc.sku,
        'unit', pc.unit,
        'price', pc.price,
        'inventory', inv."Inventory"
      )
    ) FILTER (WHERE pc.id IS NOT NULL),
    '[]'
  ) AS "combinations",
  ts_rank(p.search_text, to_tsquery('simple', :tsQuery)) as rank
FROM "Products" p
LEFT JOIN "ProductCombinations" pc
  ON pc."productId" = p.id
  AND pc."deletedAt" IS NULL
  AND pc."isBreakPack" = false
LEFT JOIN LATERAL (
  SELECT
    jsonb_build_object(
      'id', i.id,
      'quantity', i.quantity,
      'averagePrice', i."averagePrice"
    ) AS "Inventory"
  FROM "Inventories" i
  WHERE i."combinationId" = pc.id
    AND i."deletedAt" IS NULL
  LIMIT 1
) inv ON true
WHERE
  p."deletedAt" IS NULL
  AND (
    (p.search_text IS NOT NULL AND p.search_text @@ to_tsquery('simple', :tsQuery))
    ${ilikeConditionsOr ? `OR (${ilikeConditionsOr})` : ""}
  )
GROUP BY p.id, p.name, rank
ORDER BY rank DESC
LIMIT 20;
`,
          {
            replacements,
            type: QueryTypes.SELECT,
          },
        );
      } catch {
        results = [];
      }
    }

    for (const product of results) {
      let maxComboScore = 0;
      let bestCombo = null;

      if (product.combinations && product.combinations.length > 0) {
        for (const combo of product.combinations) {
          let comboScore = 0;

          if (unit && combo.unit) {
            const parsedUnit = String(unit)
              .toLowerCase()
              .replace(/[^a-z]/g, "");
            const comboUnit = String(combo.unit)
              .toLowerCase()
              .replace(/[^a-z]/g, "");
            if (
              parsedUnit === comboUnit ||
              (parsedUnit.includes(comboUnit) && comboUnit.length > 0) ||
              (comboUnit.includes(parsedUnit) && parsedUnit.length > 0)
            ) {
              comboScore += 10;
            }
          }

          const comboNameText = String(combo.name || "").toLowerCase();
          const comboNameWords = comboNameText
            .split(/[\s,;&|!():*]+/)
            .filter((w) => w.length > 0 && w !== "-");

          const qw = flattenTokens(words);
          const cw = flattenTokens(comboNameWords);
          const remaining = [...cw];

          for (const token of qw) {
            const index = remaining.indexOf(token);
            if (index !== -1) {
              remaining.splice(index, 1);
              comboScore += 5;
            }
          }

          if (
            price !== undefined &&
            price !== null &&
            combo.price !== undefined &&
            combo.price !== null
          ) {
            const p1 = parseFloat(String(price));
            const p2 = parseFloat(String(combo.price));
            if (!isNaN(p1) && !isNaN(p2)) {
              if (p1 === p2) {
                comboScore += 15;
              } else {
                const diff = Math.abs(p1 - p2);
                const percentDiff = diff / Math.max(p1, p2);
                if (percentDiff <= 0.05) {
                  comboScore += 10;
                } else if (percentDiff <= 0.15) {
                  comboScore += 5;
                }
              }
            }
          }

          if (comboScore > maxComboScore) {
            maxComboScore = comboScore;
            bestCombo = combo;
          }
        }
      }

      product.suggestionScore = Number(product.rank || 0) * 10 + maxComboScore;
      if (bestCombo) {
        product.bestMatchCombination = bestCombo;
      }
    }

    results.sort((a, b) => (b.suggestionScore || 0) - (a.suggestionScore || 0));
    return results;
  },

  breakPack: async (payload: BreakPackInput, userId: number = 1) => {
    const { fromCombinationId, quantity, toCombinationId } = payload;
    const numFromId = Number(fromCombinationId);
    const numToId = Number(toCombinationId);
    const numQty = Number(quantity);

    if (!Number.isInteger(numQty)) {
      throw new Error("Quantity must be a whole number");
    }

    return await sequelize.transaction(async (transaction) => {
      const fromInventory = await ProductCombination.findByPk(numFromId, {
        include: [
          { model: Inventory, as: "inventory" },
          { model: Product, as: "product" },
        ],
        transaction,
      });

      const toInventory = await ProductCombination.findByPk(numToId, {
        include: [{ model: Inventory, as: "inventory" }],
        transaction,
      });

      if (!fromInventory || !toInventory) {
        throw new Error("Invalid combination IDs provided.");
      }

      if (Number(fromInventory.productId) !== Number(toInventory.productId)) {
        throw new Error("Cannot convert between different products");
      }

      if (
        Number(fromInventory.id) !== Number(toInventory.isBreakPackOfId) &&
        Number(toInventory.id) !== Number(fromInventory.isBreakPackOfId)
      ) {
        throw new Error("Invalid break pack relationship");
      }

      const fromFactor = parseFloat(
        String(fromInventory.conversionFactor || 1),
      );
      const toFactor = parseFloat(String(toInventory.conversionFactor || 1));

      let totalQuantity: number;
      let type: "BREAK_PACK" | "RE_PACK";
      let averagePrice: number;

      const conversionRate = fromFactor;

      if (Number(fromInventory.id) === Number(toInventory.isBreakPackOfId)) {
        type = "BREAK_PACK";
        totalQuantity = truncateQty(numQty * conversionRate);
      } else {
        type = "RE_PACK";
        totalQuantity = truncateQty(numQty / toFactor);
        if (numQty % toFactor !== 0) {
          throw new Error(
            "Quantity must be a multiple of the break pack conversion factor",
          );
        }
      }
      totalQuantity = truncateQty(totalQuantity);
      const fromAvgPrice = Number(fromInventory.inventory?.averagePrice || 0);
      const totalCost = fromAvgPrice * numQty;
      averagePrice =
        totalQuantity > 0 ? truncateQty(totalCost / totalQuantity) : 0;

      const currentSourceQty = Number(fromInventory.inventory?.quantity || 0);

      if (currentSourceQty < numQty) {
        throw new Error("Not enough inventory");
      }

      const breakPackRecord = await BreakPack.create(
        {
          fromCombinationId: numFromId,
          toCombinationId: numToId,
          quantity: numQty,
          conversionFactor: conversionRate,
          type,
          createdBy: userId,
        },
        { transaction },
      );
      // Decrease from source
      await inventoryServerService.inventoryDecrease(
        {
          combinationId: numFromId,
          quantity: numQty,
        },
        `${type}_OUT`,
        breakPackRecord.id,
        "BREAK_PACK",
        transaction,
        userId,
      );

      // Increase target
      await inventoryServerService.inventoryIncrease(
        {
          combinationId: numToId,
          quantity: totalQuantity,
          averagePrice,
        },
        `${type}_IN`,
        breakPackRecord.id,
        "BREAK_PACK",
        transaction,
        userId,
      );

      await fromInventory.reload({
        include: [
          { model: Inventory, as: "inventory" },
          { model: Product, as: "product" },
        ],
        transaction,
      });
      await toInventory.reload({
        include: [{ model: Inventory, as: "inventory" }],
        transaction,
      });

      return { type, fromInventory, toInventory, totalQuantity, averagePrice };
    });
  },

  stockAdjustment: async (payload: StockAdjustmentInput, userId: number = 1) => {
    const validatedData = stockAdjustmentInputSchema.parse(payload);
    const { combinationId, newQuantity, reason, notes } = validatedData;

    return await sequelize.transaction(async (transaction) => {
      const inventory = await Inventory.findOne({
        where: { combinationId },
        transaction,
      });

      if (!inventory) throw new Error("Combination not found");

      const systemQuantity = Number(inventory.quantity || 0);
      const difference = newQuantity - systemQuantity;

      const adjustment = await StockAdjustment.create(
        {
          referenceNo:
            "REF" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          combinationId,
          systemQuantity,
          newQuantity,
          difference,
          reason,
          notes: notes || null,
          createdBy: userId,
        },
        { transaction },
      );

      if (difference > 0) {
        await inventoryServerService.inventoryIncrease(
          {
            combinationId,
            quantity: difference,
            averagePrice: Number(inventory.averagePrice || 0),
          },
          "ADJUSTMENT_IN",
          adjustment.id,
          "STOCK_ADJUSTMENT",
          transaction,
          userId,
        );
      } else if (difference < 0) {
        await inventoryServerService.inventoryDecrease(
          {
            combinationId,
            quantity: Math.abs(difference),
          },
          "ADJUSTMENT_OUT",
          adjustment.id,
          "STOCK_ADJUSTMENT",
          transaction,
          userId,
        );
      }

      return true;
    });
  },

  // bulkUpdateSKU: async () => {
  //   return await sequelize.transaction(async (transaction) => {
  //     const products = await Product.findAll({
  //       include: [
  //         {
  //           model: ProductCombination,
  //           as: "combinations",
  //           include: [{ model: VariantValue, as: "values" }],
  //         },
  //         {
  //           model: VariantType,
  //           as: "variants",
  //           include: [{ model: VariantValue, as: "values" }],
  //         },
  //       ],
  //       transaction,
  //     });

  //     for (const product of products) {
  //       if ((product as any).combinations) {
  //         await productCombinationServerService.updateByProductId(
  //           product.id,
  //           (product as any).combinations,
  //           0,
  //         );
  //       }
  //     }
  //     return true;
  //   });
  // },

  getByIds: async (list: (number | string)[]) => {
    const result: any[] = [];
    for (const id of list) {
      const combo = await ProductCombination.findByPk(Number(id), {
        include: [
          ...getIncludes,
          { model: PriceHistory, as: "priceHistories" },
        ],
      });
      if (combo) {
        result.push(combo);
      }
    }
    return result;
  },

  updatePrices: async (list: UpdatePriceItem[], userId: number = 1) => {
    return await sequelize.transaction(async (transaction) => {
      for (const item of list) {
        const combo = await ProductCombination.findByPk(Number(item.id), {
          transaction,
        });
        if (!combo) {
          throw new Error("combo not found");
        }
        const fromPrice = normalize(combo.price ?? 0);
        const toPrice = normalize(item.newPrice);

        if (fromPrice !== toPrice && toPrice > 0) {
          await combo.update({ price: toPrice }, { transaction });

          await PriceHistory.create(
            {
              productId: combo.productId,
              combinationId: combo.id,
              fromPrice,
              toPrice,
              changedBy: userId,
              changedAt: new Date(),
            },
            { transaction },
          );
        }
      }
      return true;
    });
  },
};

export function buildTsQuery(search?: string | null): string {
  if (typeof search !== "string") return "";

  const words = search
    .trim()
    .toLowerCase()
    .replace(/['"#]/g, "") // Remove all quotes to prevent tsquery syntax errors
    .split(/[\s,;&|!():*\-]+/)
    .filter((word) => word.length > 0 && word !== "-");

  if (words.length === 0) return "";
  return words.map((word) => `${word}:*`).join(" & ");
}

function validateCombinations(combinations: any[], product: any) {
  const seen = new Map<string, any>();
  const incomingIds = new Set(
    combinations
      .map((c) => (c.id !== undefined && c.id !== null ? Number(c.id) : null))
      .filter(Boolean),
  );

  if (Array.isArray(product?.combinations)) {
    for (const combo of product.combinations) {
      if (!incomingIds.has(Number(combo.id))) {
        const computedSKU = getSKU(
          product.name,
          product.categoryId || 1,
          combo.unit || product.baseUnit || "PCS",
          combo.values || [],
        );
        seen.set(computedSKU, combo);
      }
    }
  }

  for (const combo of combinations) {
    const computedSKU = getSKU(
      product.name,
      product.categoryId || 1,
      combo.unit || product.baseUnit || "PCS",
      combo.values || [],
    );

    if (seen.has(computedSKU)) {
      const existing = seen.get(computedSKU);
      if (existing.sku && existing.sku !== computedSKU) {
        throw new Error(`Conflict SKU ${computedSKU}`);
      } else {
        throw new Error(`Duplicate SKU ${computedSKU}`);
      }
    }

    seen.set(computedSKU, { ...combo, sku: computedSKU });
  }
}

async function validateVariants(payload: any, product: any) {
  if (payload.isBreakPackOfId) {
    const parentCombination = await ProductCombination.findByPk(
      payload.isBreakPackOfId,
      {
        include: [
          {
            model: VariantValue,
            as: "values",
            through: { attributes: [] },
          },
        ],
      },
    );
    if (!parentCombination) {
      throw new Error("Parent combination not found");
    }
    if (Number(parentCombination.productId) !== Number(product.id)) {
      throw new Error("Parent combination is not of the same product");
    }

    const variants = product.variants || [];
    if (variants.length > 1) {
      const isPrimary = variants.find((v: any) => v.isBreakpackFilter);
      if (!isPrimary) {
        throw new Error("Product must have a primary variant");
      }
      const primaryofParent = ((parentCombination as any).values || []).find(
        (v: any) => v.variantTypeId === isPrimary.id,
      );
      const primaryofChild = (payload.values || []).find(
        (v: any) => v.variantTypeId === isPrimary.id,
      );
      if (
        !primaryofParent ||
        !primaryofChild ||
        primaryofParent.id !== primaryofChild.id
      ) {
        throw new Error(
          "Parent combination values are not the same as break pack values",
        );
      }
    } else {
      const parentValues = (parentCombination as any).values || [];
      const payloadValues = payload.values || [];
      if (parentValues.length > 1 && payloadValues.length > 1) {
        if (parentValues[0].id !== payloadValues[0].id) {
          throw new Error(
            "Parent combination values are not the same as break pack values",
          );
        }
      }
    }
  }
}

async function getVariantValueIds(
  productId: number,
  values: any[] = [],
  transaction?: any,
) {
  if (!values || values.length === 0) return [];
  const variantValueMap: Record<string, any> = {};

  const variants = await VariantType.findAll({
    where: { productId },
    include: [
      {
        model: VariantValue,
        as: "values",
      },
    ],
    transaction,
  });

  for (const variant of variants) {
    const [variantType] = await VariantType.findOrCreate({
      where: { name: variant.name, productId },
      defaults: { name: variant.name, productId },
      transaction,
    });

    const variantValues = (variant as any).values || [];
    for (const valueName of variantValues) {
      const [variantValue] = await VariantValue.findOrCreate({
        where: {
          value: valueName.value,
          variantTypeId: variantType.id,
        },
        defaults: {
          value: valueName.value,
          variantTypeId: variantType.id,
        },
        transaction,
      });

      variantValueMap[`${variant.id}:${valueName.value}`] = variantValue;
    }
  }

  const variantValueIds = values
    .map(({ variantTypeId, value }) => {
      return variantValueMap[`${variantTypeId}:${value}`]?.id;
    })
    .filter(Boolean);

  return variantValueIds;
}

function flattenTokens(tokens: string[]): string[] {
  return tokens.flatMap((token) => {
    token = token.toLowerCase();
    if (/^\d+(\.\d+)?x\d+(\.\d+)?$/i.test(token)) {
      return token.split(/(x)/i).filter(Boolean);
    }
    return token;
  });
}
