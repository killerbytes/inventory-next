import { getMappedProductComboName } from "@/lib/mapped";
import { getSKU } from "@/lib/string";
import { ProductBaseSchema } from "@/schemas";
import sequelize from "@/server/db/sequelize";
import {
  Category,
  CombinationValue,
  Inventory,
  Product,
  ProductCombination,
  VariantType,
  VariantValue,
} from "@/server/models";
import { Op } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";

export interface GetProductPaginatedInput {
  q?: string | null;
  categoryId?: number | string | null;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  categoryId?: number | string | null;
  baseUnit?: string;
  description?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  categoryId?: number | string | null;
  baseUnit?: string;
  description?: string | null;
}

function getDefaultIncludes() {
  return [
    {
      model: VariantType,
      as: "variants",
      include: [
        {
          model: VariantValue,
          as: "values",
        },
      ],
    },
    {
      model: ProductCombination,
      as: "combinations",
      include: [
        {
          model: Inventory,
          as: "inventory",
        },
        {
          model: VariantValue,
          as: "values",
          through: {
            attributes: [],
          },
        },
      ],
    },
  ];
}

function getDefaultOrder(): any[] {
  return [
    ["name", "ASC"],
    [{ model: VariantType, as: "variants" }, "id", "ASC"],
    [{ model: ProductCombination, as: "combinations" }, "name", "ASC"],
    [
      { model: ProductCombination, as: "combinations" },
      { model: VariantValue, as: "values" },
      "variantTypeId",
      "ASC",
    ],
  ];
}

export const productServerService = {
  get: async (id: number) => {
    return await Product.findByPk(id, {
      include: [
        { model: Category, as: "category" },
        {
          model: VariantType,
          as: "variants",
          include: [{ model: VariantValue, as: "values" }],
        },
        {
          model: ProductCombination,
          as: "combinations",
          include: [
            { model: Inventory, as: "inventory" },
            {
              model: VariantValue,
              as: "values",
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    });
  },

  getAll: async () => {
    return await Product.findAll({
      include: [{ model: Category, as: "category" }],
      order: [["name", "ASC"]],
    });
  },

  getPaginated: async (params: GetProductPaginatedInput = {}) => {
    const { q, categoryId } = params;

    const where: any = {};
    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { "$combinations.name$": { [Op.iLike]: `%${q}%` } },
      ];
    }

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    try {
      const products = await Product.findAll({
        where,
        include: [
          ...getDefaultIncludes(),
          {
            model: Category,
            as: "category",
            include: [
              {
                model: Category,
                as: "parent",
              },
            ],
          },
        ],
      });

      const categories = await Category.findAll({
        where: { parentId: null as any },
        include: [
          {
            model: Category,
            as: "subCategories",
          },
        ],
        order: [["order", "ASC"]],
      });

      const groupedByCategory: Record<number, any> = {};
      categories.forEach((parent: any) => {
        groupedByCategory[parent.id] = {
          categoryId: parent.id,
          categoryName: parent.name,
          categoryOrder: parent.order,
          products: [],
          subCategories: ((parent as any).subCategories || []).map(
            (sub: any) => ({
              categoryId: sub.id,
              subCategoryId: sub.id,
              categoryName: sub.name,
              products: [],
            }),
          ),
        };
      });

      products.forEach((product: any) => {
        const category = product.category;
        if (!category) return;

        if (category.parent) {
          const parent = groupedByCategory[category.parent.id];
          if (!parent) return;

          const subGroup = parent.subCategories.find(
            (s: any) =>
              s.categoryId === category.id || s.subCategoryId === category.id,
          );
          if (subGroup) {
            subGroup.products.push(product);
          }
        } else {
          const parent = groupedByCategory[category.id];
          if (parent) {
            parent.products.push(product);
          }
        }
      });

      const data = Object.values(groupedByCategory).sort(
        (a: any, b: any) => (a.categoryOrder || 0) - (b.categoryOrder || 0),
      );

      return {
        data,
      };
    } catch (error) {
      handleServiceError(error);
    }
  },

  getAllBySku: async (sku: string) => {
    const product = await Product.findAll({
      where: { sku },
      include: [...getDefaultIncludes()],
      order: getDefaultOrder(),
    });

    if (!product || product.length === 0) {
      throw new Error("Product not found");
    }

    return product;
  },

  getProductsByCategoryId: async (categoryId: number | string) => {
    return await Product.findAll({
      attributes: [],
      include: [
        {
          model: ProductCombination,
          as: "combinations",
          attributes: ["id", "name", "unit", "price", "isBreakPack"],
          where: {
            isActive: true,
          },
          include: [
            {
              model: Inventory,
              as: "inventory",
              attributes: ["averagePrice", "quantity"],
            },
          ],
        },
      ],
      where: { categoryId: Number(categoryId) },
      order: [["name", "ASC"]],
      raw: true,
      nest: true,
    });
  },

  create: async (data: CreateProductInput) => {
    const validatedData = ProductBaseSchema.parse(data);
    return await sequelize.transaction(async (transaction) => {
      const product = await Product.create(
        {
          name: validatedData.name,
          categoryId: validatedData.categoryId,
          baseUnit: validatedData.baseUnit,
          description: data.description || null,
        },
        { transaction },
      );
      await productServerService.syncCombinationNames(
        product.id,
        transaction,
      );
      await productServerService.rebuildProductSearchText(
        product.id,
        transaction,
      );
      return product;
    });
  },

  update: async (id: number, data: UpdateProductInput) => {
    return await sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(id, { transaction });
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }
      await product.update(
        {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.categoryId !== undefined && {
            categoryId: data.categoryId ? Number(data.categoryId) : undefined,
          }),
          ...(data.baseUnit !== undefined && { baseUnit: data.baseUnit }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
        },
        { transaction },
      );

      await productServerService.syncCombinationNames(
        product.id,
        transaction,
      );
      await productServerService.rebuildProductSearchText(
        product.id,
        transaction,
      );
      return product;
    });
  },

  delete: async (id: number) => {
    return await sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(id, { transaction });
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const combinations = await ProductCombination.findAll({
        where: { productId: id },
        transaction,
      });

      for (const combo of combinations) {
        await Inventory.destroy({
          where: { combinationId: combo.id },
          transaction,
        });
        await CombinationValue.destroy({
          where: { combinationId: combo.id },
          transaction,
        });
      }

      await ProductCombination.destroy({
        where: { productId: id },
        transaction,
      });

      const variantTypes = await VariantType.findAll({
        where: { productId: id },
        attributes: ["id"],
        transaction,
      });
      await VariantValue.destroy({
        where: {
          variantTypeId: variantTypes.map((v) => v.id),
        },
        transaction,
      });
      await VariantType.destroy({ where: { productId: id }, transaction });
      await product.destroy({ transaction });

      return { success: true, message: `Product ${id} deleted successfully` };
    });
  },

  syncCombinationNames: async (productId: number, transaction?: any) => {
    const product = (await Product.findByPk(productId, {
      include: [...getDefaultIncludes()],
      transaction,
    })) as any;

    if (!product || !product.combinations?.length) return;

    const updates = (product.combinations as any[])
      .map((combo: any) => {
        const values = [...(combo.values || [])].sort(
          (a: any, b: any) => a.variantTypeId - b.variantTypeId,
        );

        const sku = getSKU(
          product.name,
          product.categoryId || 1,
          combo.unit || product.baseUnit || "PCS",
          values,
        );

        const name = getMappedProductComboName(product, values);

        if (combo.sku !== sku || combo.name !== name) {
          return { id: combo.id, sku, name };
        }
        return null;
      })
      .filter(
        (item: any): item is { id: number; sku: string; name: string } =>
          item !== null,
      );

    if (!updates.length) return;

    for (const combo of updates) {
      await ProductCombination.update(
        { sku: combo.sku, name: combo.name },
        { where: { id: combo.id }, transaction },
      );
    }
  },

  rebuildProductSearchText: async (productId: number, transaction?: any) => {
    try {
      const dialect = sequelize.getDialect();
      if (dialect === "sqlite") return;

      const queryTarget = transaction ? transaction.sequelize : sequelize;
      await queryTarget.query(
        `
      UPDATE "Products"
      SET search_text =
        to_tsvector(
          'simple',
          regexp_replace(
            regexp_replace(
              coalesce(name, '') || ' ' ||
              coalesce(description, '') || ' ' ||
              coalesce((
                SELECT string_agg(pc.name, ' ')
                FROM "ProductCombinations" pc
                WHERE pc."productId" = "Products".id
                  AND pc."deletedAt" IS NULL
              ), ''),
              '[-()_/#.,]', ' ', 'g'
            ),
            '([a-zA-Z]+)\\s*([0-9]+)', '\\1 \\2 \\1\\2', 'g'
          )
        )
      WHERE id = :productId
      `,
        {
          replacements: { productId },
          transaction,
        },
      );
    } catch {
      // safe fallback if full-text vector not active
    }
  },
};
