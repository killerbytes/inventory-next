import { normalize, truncateQty } from "@/lib/compute";
import { getMappedProductComboName } from "@/lib/mapped";
import { getSKU, getBarcode } from "@/lib/string";
import {
  BreakPackInput,
  ProductCombinationUpdate,
  StockAdjustmentInput,
  stockAdjustmentInputSchema,
} from "@/schemas";
import { db } from "@/server/db/drizzle";
import {
  productCombinations,
  combinationValues,
} from "@/server/db/schema/productCombinations";
import { products } from "@/server/db/schema/products";
import { variantTypes, variantValues } from "@/server/db/schema/variantTypes";
import { inventories } from "@/server/db/schema/inventories";
import { priceHistories } from "@/server/db/schema/priceHistories";
import { breakPacks } from "@/server/db/schema/breakPacks";
import { stockAdjustments } from "@/server/db/schema/stockAdjustments";
import {
  eq,
  and,
  isNull,
  inArray,
  notInArray,
  asc,
  sql,
} from "drizzle-orm";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { inventoryServerService } from "./inventoryServer.service";
import { productServerService } from "./productServer.service";
export interface SearchProductCombinationInventory {
  id: number;
  quantity: number;
  averagePrice: string | number;
}

export interface SearchProductCombinationItem {
  id: number;
  productId: number;
  name: string;
  sku: string;
  unit: string;
  price: string | number;
  inventory?: SearchProductCombinationInventory | null;
  product?: {
    id: number;
    name: string;
    categoryId: number;
  };
}

export interface SearchProductResult {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  combinations: SearchProductCombinationItem[];
}


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

export const productCombinationServerService = {
  buildTsQuery,

  get: async (id: number | string) => {
    const numId = Number(id);
    const combo = await db.query.productCombinations.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, numId), isNull(tbl.deletedAt)),
      with: {
        product: {
          with: {
            variants: {
              orderBy: (tbl, { asc }) => asc(tbl.name),
            },
          },
        },
        inventory: true,
        combinationValues: {
          with: {
            value: true,
          },
        },
      },
    });

    if (!combo) {
      throw new Error("Product combination not found");
    }

    const values = (combo.combinationValues || [])
      .map((cv: any) => cv.value)
      .filter(Boolean);

    return {
      ...combo,
      values,
    };
  },

  getByProductId: async (id: number | string) => {
    const numId = Number(id);
    const combos = await db.query.productCombinations.findMany({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.productId, numId), isNull(tbl.deletedAt)),
      with: {
        inventory: true,
        combinationValues: {
          with: {
            value: true,
          },
        },
      },
      orderBy: [
        asc(productCombinations.name),
        sql`${productCombinations.isBreakPackOfId} ASC NULLS FIRST`,
      ],
    });

    const variants = await db.query.variantTypes.findMany({
      where: (tbl, { eq }) => eq(tbl.productId, numId),
      with: {
        values: {
          orderBy: (tbl, { asc }) => asc(tbl.value),
        },
      },
      orderBy: (tbl, { asc }) => asc(tbl.name),
    });

    const formattedCombinations = combos.map((c: any) => {
      const formatted = {
        ...c,
        values: (c.combinationValues || [])
          .map((cv: any) => cv.value)
          .filter(Boolean),
      };
      (formatted as any).dataValues = formatted;
      return formatted;
    });

    return {
      combinations: formattedCombinations,
      variants,
    };
  },

  getByBarcode: async (barcode: string) => {
    const combo = await db.query.productCombinations.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.barcode, barcode), isNull(tbl.deletedAt)),
      with: {
        product: {
          with: {
            variants: {
              orderBy: (tbl, { asc }) => asc(tbl.name),
            },
          },
        },
        inventory: true,
        combinationValues: {
          with: {
            value: true,
          },
        },
      },
    });

    if (!combo) {
      throw new Error("Product combination not found");
    }

    const values = (combo.combinationValues || [])
      .map((cv: any) => cv.value)
      .filter(Boolean);

    return {
      ...combo,
      values,
    };
  },

  getByCategoryId: async (categoryId: number | string) => {
    const categoryProducts = await db.query.products.findMany({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.categoryId, Number(categoryId)), isNull(tbl.deletedAt)),
      columns: { id: true },
    });

    if (categoryProducts.length === 0) return [];
    const productIds = categoryProducts.map((p) => p.id);

    const combos = await db.query.productCombinations.findMany({
      where: (tbl, { eq, and, isNull, inArray }) =>
        and(
          eq(tbl.isActive, true),
          isNull(tbl.deletedAt),
          inArray(tbl.productId, productIds),
        ),
      with: {
        product: true,
        inventory: true,
      },
    });

    return combos;
  },

  updateByProductId: async (
    productId: number | string,
    combinationsList: ProductCombinationUpdate[],
    userId: number = 1,
  ) => {
    const numProductId = Number(productId);
    try {
      return await db.transaction(async (tx) => {
        const product = await tx.query.products.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.id, numProductId), isNull(tbl.deletedAt)),
          with: {
            variants: {
              with: { values: true },
            },
            combinations: {
              where: (tbl, { isNull }) => isNull(tbl.deletedAt),
              with: {
                inventory: true,
                combinationValues: {
                  with: { value: true },
                },
              },
            },
          },
        });

        if (!product) {
          throw new Error("Product not found");
        }

        const incomingCombinations = (combinationsList || []).filter(
          (comb: any) => !comb.isDeleted,
        );
        validateCombinations(incomingCombinations, {
          ...product,
          combinations: [],
        });

        const existingMap = new Map<number, any>();
        (product.combinations || []).forEach((comb: any) => {
          existingMap.set(comb.id, comb);
        });

        const incomingIds = new Set(
          incomingCombinations
            .map((c: any) =>
              c.id !== undefined && c.id !== null ? Number(c.id) : null,
            )
            .filter(Boolean),
        );

        const deleteCandidates = (product.combinations || []).filter(
          (comb: any) => !incomingIds.has(comb.id),
        );

        const blockedIds = deleteCandidates
          .filter(
            (comb: any) =>
              comb.inventory && Number(comb.inventory.quantity) > 0,
          )
          .map((comb: any) => comb.id);

        if (blockedIds.length > 0) {
          throw new Error(
            `Cannot delete combinations with inventory > 0: ${blockedIds.join(", ")}`,
          );
        }

        const deletableIds = deleteCandidates.map((comb: any) => comb.id);
        if (deletableIds.length > 0) {
          await tx
            .update(productCombinations)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(inArray(productCombinations.id, deletableIds));
        }

        for (const combo of incomingCombinations) {
          const comboId =
            combo.id !== undefined && combo.id !== null
              ? Number(combo.id)
              : null;

          const variantValueIds = await getVariantValueIds(
            numProductId,
            combo.values || [],
            tx,
          );

          if (variantValueIds.length !== (combo.values || []).length) {
            throw new Error("Some variant values are invalid or missing");
          }

          const computedName =
            combo.name ||
            getMappedProductComboName(product, combo.values || []);
          const computedSku = getSKU(
            product.name,
            product.categoryId || 1,
            combo.unit || product.baseUnit || "PCS",
            combo.values || [],
          );

          let savedCombinationId: number;

          if (comboId !== null) {
            if (!existingMap.has(comboId)) {
              throw new Error(`Combination with ID ${comboId} not found`);
            }

            const existing = existingMap.get(comboId)!;

            if (
              combo.price !== undefined &&
              normalize(combo.price ?? 0) !==
              normalize(Number(existing.price ?? 0))
            ) {
              await tx.insert(priceHistories).values({
                productId: numProductId,
                combinationId: existing.id,
                fromPrice: String(existing.price ?? 0),
                toPrice: String(normalize(combo.price ?? 0)),
                changedBy: userId,
                changedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            await tx
              .update(productCombinations)
              .set({
                name: computedName,
                sku: computedSku,
                unit: combo.unit || existing.unit,
                price:
                  combo.price !== undefined
                    ? String(combo.price)
                    : existing.price,
                conversionFactor:
                  combo.conversionFactor !== undefined
                    ? String(combo.conversionFactor)
                    : existing.conversionFactor,
                barcode: (combo as any).barcode !== undefined ? (combo as any).barcode : existing.barcode,
                reorderLevel:
                  combo.reorderLevel !== undefined
                    ? combo.reorderLevel
                    : existing.reorderLevel,
                isBreakPack: combo.isBreakPack ?? existing.isBreakPack,
                isBreakPackOfId:
                  combo.isBreakPackOfId !== undefined
                    ? combo.isBreakPackOfId
                    : existing.isBreakPackOfId,
                isActive: combo.isActive ?? existing.isActive,
                productId: numProductId,
                updatedAt: new Date(),
              })
              .where(eq(productCombinations.id, comboId));

            savedCombinationId = comboId;

            // Delete old combinationValues
            await tx
              .delete(combinationValues)
              .where(eq(combinationValues.combinationId, comboId));
          } else {
            const [created] = await tx
              .insert(productCombinations)
              .values({
                name: computedName,
                sku: computedSku,
                unit: combo.unit || product.baseUnit || "PCS",
                price: combo.price !== undefined ? String(combo.price) : "0",
                conversionFactor:
                  combo.conversionFactor !== undefined
                    ? String(combo.conversionFactor)
                    : "1",
                barcode: (combo as any).barcode || null,
                reorderLevel: combo.reorderLevel || null,
                isBreakPack: combo.isBreakPack ?? false,
                isBreakPackOfId: combo.isBreakPackOfId || null,
                isActive: combo.isActive ?? true,
                productId: numProductId,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();

            if (!created.barcode) {
              const generatedBarcode = getBarcode(created.id);
              await tx
                .update(productCombinations)
                .set({ barcode: generatedBarcode, updatedAt: new Date() })
                .where(eq(productCombinations.id, created.id));
              created.barcode = generatedBarcode;
            }

            savedCombinationId = created.id;
          }

          // Insert combinationValues
          for (const vvId of variantValueIds) {
            await tx.insert(combinationValues).values({
              combinationId: savedCombinationId,
              variantValueId: vvId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // Ensure inventory record exists
          const existingInv = await tx.query.inventories.findFirst({
            where: (tbl, { eq }) =>
              eq(tbl.combinationId, savedCombinationId),
          });
          if (!existingInv) {
            await tx.insert(inventories).values({
              combinationId: savedCombinationId,
              quantity: "0",
              averagePrice: "0",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        await productServerService.syncCombinationNames(numProductId, tx);
        await productServerService.rebuildProductSearchText(numProductId, tx);

        return {
          success: true,
          message: "Product combinations updated successfully",
        };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  search: async (
    query: SearchProductCombinationsInput,
  ): Promise<SearchProductResult[]> => {
    const { search, noBreakPacks = null, limit = 50 } = query;
    const tsQuery = buildTsQuery(search);

    const noBreakPacksCondition =
      noBreakPacks === true || noBreakPacks === "true"
        ? sql`AND pc."isBreakPack" = false`
        : sql``;

    const results = await db.execute(sql`
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
              'inventory', inv."Inventory",
              'product', jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'categoryId', p."categoryId"
              )
            )
          ) FILTER (WHERE pc.id IS NOT NULL),
          '[]'::json
        ) AS "combinations"
      FROM "Products" p
      LEFT JOIN "ProductCombinations" pc
        ON pc."productId" = p.id
        AND pc."deletedAt" IS NULL
        ${noBreakPacksCondition}
      LEFT JOIN LATERAL (
        SELECT
          jsonb_build_object(
            'id', i.id,
            'combinationId', i."combinationId",
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
        ${tsQuery
        ? sql`AND (
                p.search_text @@ to_tsquery('simple', ${tsQuery})
                OR p.name ILIKE ${`%${search}%`}
                OR pc.name ILIKE ${`%${search}%`}
                OR pc.sku ILIKE ${`%${search}%`}
              )`
        : sql``
      }
      GROUP BY p.id, p.name, p.description, p."categoryId"
      ORDER BY p.name ASC
      LIMIT ${limit}
    `);
    return results.rows as unknown as SearchProductResult[];
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
    const ilikeSqlList = wordsForQuery.map(
      (w) => sql`p.search_text::text ILIKE ${`%${w}%`}`,
    );
    const ilikeOr =
      ilikeSqlList.length > 0
        ? sql`OR (${sql.join(ilikeSqlList, sql` OR `)})`
        : sql``;

    let results: any[] = [];
    try {
      const qRes = await db.execute(sql`
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
          ts_rank(p.search_text, to_tsquery('simple', ${tsQuery})) as rank
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
            (p.search_text IS NOT NULL AND p.search_text @@ to_tsquery('simple', ${tsQuery}))
            ${ilikeOr}
          )
        GROUP BY p.id, p.name, rank
        ORDER BY rank DESC
        LIMIT 100;
      `);
      results = (qRes.rows as any[]) || [];
    } catch {
      results = [];
    }

    if (results.length === 0) {
      try {
        tsQuery = wordsForQuery.map((w) => `${w}:*`).join(" | ");
        const qRes = await db.execute(sql`
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
            ts_rank(p.search_text, to_tsquery('simple', ${tsQuery})) as rank
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
              (p.search_text IS NOT NULL AND p.search_text @@ to_tsquery('simple', ${tsQuery}))
              ${ilikeOr}
            )
          GROUP BY p.id, p.name, rank
          ORDER BY rank DESC
          LIMIT 20;
        `);
        results = (qRes.rows as any[]) || [];
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
            .filter((w: string) => w.length > 0 && w !== "-");

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

    return await db.transaction(async (tx) => {
      const fromInventory = await tx.query.productCombinations.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, numFromId), isNull(tbl.deletedAt)),
        with: {
          inventory: true,
          product: true,
        },
      });

      const toInventory = await tx.query.productCombinations.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, numToId), isNull(tbl.deletedAt)),
        with: {
          inventory: true,
        },
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

      const [breakPackRecord] = await tx
        .insert(breakPacks)
        .values({
          fromCombinationId: numFromId,
          toCombinationId: numToId,
          quantity: String(numQty),
          conversionFactor: String(conversionRate),
          type,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Decrease from source
      await inventoryServerService.inventoryDecrease(
        {
          combinationId: numFromId,
          quantity: numQty,
        },
        `${type}_OUT`,
        breakPackRecord.id,
        "BREAK_PACK",
        tx,
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
        tx,
        userId,
      );

      const updatedFrom = await tx.query.productCombinations.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, numFromId),
        with: {
          inventory: true,
          product: true,
        },
      });

      const updatedTo = await tx.query.productCombinations.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, numToId),
        with: {
          inventory: true,
        },
      });

      return {
        type,
        fromInventory: updatedFrom,
        toInventory: updatedTo,
        totalQuantity,
        averagePrice,
      };
    });
  },

  stockAdjustment: async (
    payload: StockAdjustmentInput,
    userId: number = 1,
  ) => {
    const validatedData = stockAdjustmentInputSchema.parse(payload);
    const { combinationId, newQuantity, reason, notes } = validatedData;

    return await db.transaction(async (tx) => {
      const inventory = await tx.query.inventories.findFirst({
        where: (tbl, { eq }) => eq(tbl.combinationId, combinationId),
      });

      if (!inventory) throw new Error("Combination not found");

      const systemQuantity = Number(inventory.quantity || 0);
      const difference = newQuantity - systemQuantity;

      const [adjustment] = await tx
        .insert(stockAdjustments)
        .values({
          referenceNo:
            "REF" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          combinationId,
          systemQuantity: String(systemQuantity),
          newQuantity: String(newQuantity),
          difference: String(difference),
          reason,
          notes: notes || null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

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
          tx,
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
          tx,
          userId,
        );
      }

      return true;
    });
  },

  getByIds: async (list: (number | string)[]) => {
    const numIds = list.map((id) => Number(id));
    if (numIds.length === 0) return [];

    const combos = await db.query.productCombinations.findMany({
      where: (tbl, { inArray, and, isNull }) =>
        and(inArray(tbl.id, numIds), isNull(tbl.deletedAt)),
      with: {
        product: true,
        inventory: true,
        priceHistories: true,
        combinationValues: {
          with: { value: true },
        },
      },
    });

    return combos.map((c: any) => ({
      ...c,
      values: (c.combinationValues || [])
        .map((cv: any) => cv.value)
        .filter(Boolean),
    }));
  },

  updatePrices: async (list: UpdatePriceItem[], userId: number = 1) => {
    return await db.transaction(async (tx) => {
      for (const item of list) {
        const numId = Number(item.id);
        const combo = await tx.query.productCombinations.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.id, numId), isNull(tbl.deletedAt)),
        });

        if (!combo) {
          throw new Error("combo not found");
        }

        const fromPrice = normalize(Number(combo.price ?? 0));
        const toPrice = normalize(item.newPrice);

        if (fromPrice !== toPrice && toPrice > 0) {
          await tx
            .update(productCombinations)
            .set({ price: String(toPrice), updatedAt: new Date() })
            .where(eq(productCombinations.id, numId));

          await tx.insert(priceHistories).values({
            productId: combo.productId,
            combinationId: combo.id,
            fromPrice: String(fromPrice),
            toPrice: String(toPrice),
            changedBy: userId,
            changedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
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
    .replace(/['"#]/g, "")
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

async function getVariantValueIds(
  productId: number,
  values: any[] = [],
  tx: any,
) {
  if (!values || values.length === 0) return [];
  const variantValueMap: Record<string, any> = {};

  const variants = await tx.query.variantTypes.findMany({
    where: (tbl: any, { eq }: any) => eq(tbl.productId, productId),
    with: {
      values: true,
    },
  });

  for (const variant of variants) {
    const vValues = variant.values || [];
    for (const vVal of vValues) {
      variantValueMap[`${variant.id}:${vVal.value}`] = vVal;
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
