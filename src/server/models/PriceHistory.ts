import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class PriceHistory extends Model<
  InferAttributes<PriceHistory>,
  InferCreationAttributes<PriceHistory>
> {
  declare id: CreationOptional<number>;
  declare productId: number;
  declare combinationId: CreationOptional<number | null>;
  declare fromPrice: number;
  declare toPrice: number;
  declare changedBy: number;
  declare changedAt: CreationOptional<Date>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

PriceHistory.init(
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
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fromPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    toPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    modelName: "PriceHistory",
    tableName: "PriceHistories",
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

export default PriceHistory;
