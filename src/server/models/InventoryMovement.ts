import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class InventoryMovement extends Model<
  InferAttributes<InventoryMovement>,
  InferCreationAttributes<InventoryMovement>
> {
  declare id: CreationOptional<number>;
  declare type: string;
  declare quantity: number;
  declare costPerUnit: CreationOptional<number | null>;
  declare totalCost: CreationOptional<number | null>;
  declare referenceType: CreationOptional<string | null>;
  declare referenceId: CreationOptional<number | null>;
  declare combinationId: CreationOptional<number | null>;
  declare userId: CreationOptional<number | null>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

InventoryMovement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: false,
    },
    costPerUnit: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: true,
    },
    totalCost: {
      type: DataTypes.DECIMAL(18, 6),
      allowNull: true,
    },
    referenceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: "InventoryMovement",
    tableName: "InventoryMovements",
  },
);

export default InventoryMovement;
