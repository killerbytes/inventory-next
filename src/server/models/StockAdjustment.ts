import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class StockAdjustment extends Model<
  InferAttributes<StockAdjustment>,
  InferCreationAttributes<StockAdjustment>
> {
  declare id: CreationOptional<number>;
  declare referenceNo: CreationOptional<string | null>;
  declare combinationId: number;
  declare systemQuantity: CreationOptional<number>;
  declare newQuantity: CreationOptional<number>;
  declare difference: CreationOptional<number>;
  declare reason: string;
  declare notes: CreationOptional<string | null>;
  declare createdBy: number;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

StockAdjustment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    referenceNo: {
      type: DataTypes.STRING,
    },
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    systemQuantity: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
    },
    newQuantity: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
    },
    difference: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
      defaultValue: 0,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
    },
    createdBy: {
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
    modelName: "StockAdjustment",
    tableName: "StockAdjustments",
    defaultScope: {
      attributes: { exclude: ["updatedAt"] },
    },
  },
);

export default StockAdjustment;
