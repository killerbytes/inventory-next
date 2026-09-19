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

export class SalesOrderItem extends Model<
  InferAttributes<SalesOrderItem>,
  InferCreationAttributes<SalesOrderItem>
> {
  declare id: CreationOptional<number>;
  declare salesOrderId: number;
  declare combinationId: number;
  declare quantity: CreationOptional<number>;
  declare originalPrice: CreationOptional<number>;
  declare purchasePrice: CreationOptional<number>;
  declare totalAmount: CreationOptional<number>;
  declare discount: CreationOptional<number | null>;
  declare unit: string;
  declare discountNote: CreationOptional<string | null>;
  declare skuSnapshot: string;
  declare nameSnapshot: string;
  declare categorySnapshot: any;
  declare variantSnapshot: any;

  declare combinations: NonAttribute<ProductCombination>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

SalesOrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    salesOrderId: {
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
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
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
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discountNote: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: "SalesOrderItem",
    tableName: "SalesOrderItems",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

export default SalesOrderItem;
