import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class BreakPack extends Model<
  InferAttributes<BreakPack>,
  InferCreationAttributes<BreakPack>
> {
  declare id: CreationOptional<number>;
  declare fromCombinationId: number;
  declare toCombinationId: number;
  declare quantity: CreationOptional<number>;
  declare conversionFactor: CreationOptional<number>;
  declare type: CreationOptional<string>;
  declare createdBy: CreationOptional<number>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

BreakPack.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fromCombinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    toCombinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    conversionFactor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "BREAK_PACK",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    modelName: "BreakPack",
    tableName: "BreakPacks",
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

export default BreakPack;
