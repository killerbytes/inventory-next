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
import Customer from "./Customer";
import OrderStatusHistory from "./OrderStatusHistory";
import ReturnTransaction from "./ReturnTransaction";
import SalesOrderItem from "./SalesOrderItem";

import { format } from "date-fns";
import { getNextSequence } from "@/lib/sequence";

export class SalesOrder extends Model<
  InferAttributes<SalesOrder>,
  InferCreationAttributes<SalesOrder>
> {
  declare id: CreationOptional<number>;
  declare salesOrderNumber: CreationOptional<string>;
  declare customerId: CreationOptional<number | null>;
  declare status: string;
  declare orderDate: CreationOptional<Date | null>;
  declare isDelivery: CreationOptional<boolean | null>;
  declare isDeliveryCompleted: CreationOptional<boolean | null>;
  declare deliveryAddress: CreationOptional<string | null>;
  declare deliveryInstructions: CreationOptional<string | null>;
  declare deliveryDate: CreationOptional<Date | null>;
  declare cancellationReason: CreationOptional<string | null>;
  declare totalAmount: number;
  declare notes: CreationOptional<string | null>;
  declare internalNotes: CreationOptional<string | null>;
  declare modeOfPayment: string;
  declare checkNumber: CreationOptional<string | null>;
  declare dueDate: CreationOptional<Date | null>;

  declare salesOrderItems: NonAttribute<SalesOrderItem[]>;
  declare customer: NonAttribute<Customer>;
  declare returnTransactions: NonAttribute<ReturnTransaction[]>;
  declare salesOrderStatusHistory: NonAttribute<OrderStatusHistory[]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

SalesOrder.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    salesOrderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDelivery: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeliveryCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    deliveryAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deliveryInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    modeOfPayment: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "CASH",
    },
    checkNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: "SalesOrder",
    tableName: "SalesOrders",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

SalesOrder.beforeValidate(async (order) => {
  const now = new Date();
  const yearMonth = format(now, "yyyy-MM");

  if (!order.salesOrderNumber) {
    const nextval = await getNextSequence("sales_order_seq", sequelize);
    order.salesOrderNumber = `SO-${yearMonth}-${String(nextval).padStart(4, "0")}`;
  }
});

export default SalesOrder;
