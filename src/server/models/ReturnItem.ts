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

export class ReturnItem extends Model<
  InferAttributes<ReturnItem>,
  InferCreationAttributes<ReturnItem>
> {
  declare id: CreationOptional<number>;
  declare returnTransactionId: number;
  declare combinationId: number;
  declare quantity: number;
  declare unitPrice: number;
  declare totalAmount: number;
  declare reason: CreationOptional<string | null>;
  declare type: string;

  declare combination: NonAttribute<ProductCombination>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ReturnItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    returnTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
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
    modelName: "ReturnItem",
    tableName: "ReturnItems",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

export default ReturnItem;
