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
import User from "./User";

export class OrderStatusHistory extends Model<
  InferAttributes<OrderStatusHistory>,
  InferCreationAttributes<OrderStatusHistory>
> {
  declare id: CreationOptional<number>;
  declare goodReceiptId: CreationOptional<number | null>;
  declare salesOrderId: CreationOptional<number | null>;
  declare status: string;
  declare changedBy: number;
  declare changedAt: CreationOptional<Date>;
  declare user: NonAttribute<User>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

OrderStatusHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    goodReceiptId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
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
    modelName: "OrderStatusHistory",
    tableName: "OrderStatusHistories",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

export default OrderStatusHistory;
