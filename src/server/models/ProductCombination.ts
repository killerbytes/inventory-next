import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";
import Inventory from "./Inventory";
import VariantValue from "./VariantValue";
import { getBarcode } from "@/lib/string";

export class ProductCombination extends Model<
  InferAttributes<ProductCombination>,
  InferCreationAttributes<ProductCombination>
> {
  declare id: CreationOptional<number>;
  declare productId: number;
  declare name: string;
  declare sku: CreationOptional<string | null>;
  declare barcode: CreationOptional<string | null>;
  declare unit: string;
  declare conversionFactor: CreationOptional<number | null>;
  declare price: CreationOptional<number | null>;
  declare reorderLevel: CreationOptional<number | null>;
  declare isBreakPack: CreationOptional<boolean | null>;
  declare isBreakPackOfId: CreationOptional<number | null>;
  declare isActive: CreationOptional<boolean | null>;

  declare inventory?: NonAttribute<Inventory>;
  declare values?: NonAttribute<VariantValue[]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

ProductCombination.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
    },
    barcode: {
      type: DataTypes.STRING,
    },
    unit: {
      type: DataTypes.STRING,
    },
    conversionFactor: {
      type: DataTypes.DECIMAL(18, 6),
    },
    price: {
      type: DataTypes.DECIMAL(18, 6),
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
    },
    isBreakPack: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isBreakPackOfId: {
      type: DataTypes.INTEGER,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
    },
    updatedAt: {
      type: DataTypes.DATE,
    },
    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: "ProductCombination",
    tableName: "ProductCombinations",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

ProductCombination.afterCreate(async (combo, options) => {
  if (!combo.barcode) {
    const generatedBarcode = getBarcode(combo.id);
    await combo.update(
      { barcode: generatedBarcode },
      {
        transaction: options?.transaction,
        hooks: false,
      },
    );
  }
});

ProductCombination.beforeDestroy(async (combo, options) => {
  const transaction = options?.transaction;
  const inv =
    combo.inventory ||
    (await Inventory.findOne({
      where: { combinationId: combo.id },
      transaction,
    }));

  if (inv && Number(inv.quantity) > 0) {
    throw new Error(
      `Cannot delete product combination ${combo.sku || combo.id} — inventory has ${inv.quantity}.`,
    );
  }
});

ProductCombination.afterDestroy(async (combo, options) => {
  await Inventory.destroy({
    where: { combinationId: combo.id },
    transaction: options?.transaction,
  });
});

export default ProductCombination;
