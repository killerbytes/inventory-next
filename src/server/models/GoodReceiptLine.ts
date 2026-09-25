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
import ProductCombination from "./ProductCombination";

export class GoodReceiptLine extends Model<
  InferAttributes<GoodReceiptLine>,
  InferCreationAttributes<GoodReceiptLine>
> {
  declare id: CreationOptional<number>;
  declare goodReceiptId: number;
  declare combinationId: number;
  declare quantity: CreationOptional<number>;
  declare purchasePrice: CreationOptional<number>;
  declare totalAmount: CreationOptional<number>;
  declare discount: CreationOptional<number | null>;
  declare discountNote: CreationOptional<string | null>;
  declare unit: string;
  declare skuSnapshot: string;
  declare nameSnapshot: string;
  declare categorySnapshot: any;
  declare variantSnapshot: any;
  declare combination: NonAttribute<ProductCombination>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

GoodReceiptLine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    goodReceiptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    discountNote: {
      type: DataTypes.TEXT,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    skuSnapshot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nameSnapshot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categorySnapshot: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    variantSnapshot: {
      type: DataTypes.JSON,
      allowNull: false,
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
    modelName: "GoodReceiptLine",
    tableName: "GoodReceiptLines",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

export default GoodReceiptLine;
