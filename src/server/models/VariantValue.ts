import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";
import CombinationValue from "./CombinationValue";
import Inventory from "./Inventory";
import ProductCombination from "./ProductCombination";

export class VariantValue extends Model<
  InferAttributes<VariantValue>,
  InferCreationAttributes<VariantValue>
> {
  declare id: CreationOptional<number>;
  declare value: string;
  declare variantTypeId: number;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

VariantValue.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    variantTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: "VariantValue",
    tableName: "VariantValues",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "CombinationValue"] },
    },
  },
);

VariantValue.beforeDestroy(async (variantValue, options) => {
  const transactionProvided = Boolean(options && options.transaction);
  const t =
    options?.transaction ||
    (await (variantValue.sequelize || sequelize).transaction());

  try {
    const combRows = await CombinationValue.findAll({
      where: { variantValueId: variantValue.id },
      attributes: ["combinationId"],
      transaction: t,
    });

    if (!combRows.length) {
      if (!transactionProvided) await t.commit();
      return;
    }

    const combinationIds = [
      ...new Set(combRows.map((r: any) => r.combinationId)),
    ];

    const combos = await ProductCombination.findAll({
      where: { id: { [Op.in]: combinationIds } },
      include: [{ model: Inventory, as: "inventory" }],
      transaction: t,
      paranoid: false,
    });

    for (const combo of combos) {
      const inv = (combo as any).inventory;
      if (inv && Number(inv.quantity) > 0) {
        throw new Error(
          `Cannot delete variant value "${variantValue.value}" — product combination "${
            (combo as any).sku || combo.id
          }" has inventory ${inv.quantity}.`,
        );
      }
    }

    for (const combo of combos) {
      if ((combo as any).inventory) {
        await (combo as any).inventory.destroy({ transaction: t });
      }
      await combo.destroy({ transaction: t });
    }

    if (!transactionProvided) await t.commit();
  } catch (err) {
    if (!transactionProvided) await t.rollback();
    throw err;
  }
});

export default VariantValue;
