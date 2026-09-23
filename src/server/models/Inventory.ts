import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class Inventory extends Model<
  InferAttributes<Inventory>,
  InferCreationAttributes<Inventory>
> {
  declare id: CreationOptional<number>;
  declare combinationId: number;
  declare averagePrice: CreationOptional<number | null>;
  declare quantity: CreationOptional<number>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Inventory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    averagePrice: {
      type: DataTypes.DECIMAL(18, 6),
      defaultValue: 0,
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 6),
      defaultValue: 0,
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
    modelName: "Inventory",
    tableName: "Inventories",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
      order: [["id", "ASC"]],
    },
  },
);

export default Inventory;
