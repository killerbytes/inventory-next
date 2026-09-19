import sequelize from "@/server/db/sequelize";
import { VariantType, VariantValue } from "@/server/models";
import { Op } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";

export interface CreateVariantTypeInput {
  name: string;
  productId?: number;
  values?: any[];
}

export interface UpdateVariantTypeInput {
  id?: number;
  name?: string;
  values?: any[];
  isBreakpackFilter?: boolean;
}

export const variantTypesServerService = {
  get: async (id: number) => {
    return await VariantType.findByPk(id, {
      include: [{ model: VariantValue, as: "values" }],
    });
  },

  getByProductId: async (productId: number) => {
    return await VariantType.findAll({
      where: { productId: Number(productId) },
      include: [{ model: VariantValue, as: "values" }],
      order: [
        ["id", "ASC"],
        [{ model: VariantValue, as: "values" }, "value", "ASC"],
      ],
    });
  },

  getAll: async (productId?: number) => {
    const where = productId
      ? { productId: Number(productId) }
      : { isTemplate: true };
    return await VariantType.findAll({
      where,
      include: [{ model: VariantValue, as: "values" }],
      order: [["name", "ASC"]],
    });
  },

  create: async (data: CreateVariantTypeInput) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const result = await VariantType.create(data, { transaction });

        for (const value of data.values || []) {
          await VariantValue.create(
            {
              value: value.value,
              variantTypeId: result.id,
            },
            { transaction },
          );
        }

        return result;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: UpdateVariantTypeInput) => {
    const { id: _id, values = [], ...rest } = data;
    console.log(565, JSON.stringify(data, null, 2));
    try {
      const variantType = await VariantType.findByPk(id);
      if (!variantType) {
        throw new Error(`VariantType with ID ${id} not found`);
      }

      return await sequelize.transaction(async (transaction) => {
        if (data.isBreakpackFilter) {
          const variantsExists = await VariantType.findOne({
            where: {
              productId: variantType.productId,
              id: { [Op.ne]: id },
              isBreakpackFilter: true,
            },
          });
          if (variantsExists) {
            await variantsExists.update(
              { isBreakpackFilter: false },
              { transaction },
            );
          }
        }

        await variantType.update(rest, { transaction });

        const existingVariantValues = await VariantValue.findAll({
          where: { variantTypeId: variantType.id },
          transaction,
        });
        const deleteIds = existingVariantValues
          .map((i) => i.id)
          .filter((item) => !values?.map((i) => i.id).includes(item));

        await VariantValue.destroy({
          where: { id: deleteIds },
          transaction,
        });

        for (const value of values) {
          if (value?.id) {
            const variantValue = await VariantValue.findByPk(value.id);
            await variantValue?.update({ value: value.value }, { transaction });
          } else {
            await VariantValue.create(
              { variantTypeId: variantType.id, value: value.value },
              { transaction },
            );
          }
        }

        return variantType;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    const variantType = await VariantType.findByPk(id);
    if (!variantType) {
      throw new Error(`VariantType with ID ${id} not found`);
    }

    await sequelize.transaction(async (transaction) => {
      await VariantValue.destroy({
        where: { variantTypeId: id },
        transaction,
      });
      await variantType.destroy({ transaction });
    });

    return { success: true, message: `VariantType ${id} deleted successfully` };
  },
};

export const variantTypeServerService = variantTypesServerService;
