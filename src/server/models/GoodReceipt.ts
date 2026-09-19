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
import GoodReceiptLine from "./GoodReceiptLine";
import OrderStatusHistory from "./OrderStatusHistory";
import ReturnTransaction from "./ReturnTransaction";
import Supplier from "./Supplier";

export class GoodReceipt extends Model<
  InferAttributes<GoodReceipt>,
  InferCreationAttributes<GoodReceipt>
> {
  declare id: CreationOptional<number>;
  declare supplierId: number;
  declare status: CreationOptional<string>;
  declare receiptDate: CreationOptional<Date>;
  declare cancellationReason: CreationOptional<string | null>;
  declare totalAmount: number;
  declare referenceNo: string;
  declare internalNotes: CreationOptional<string | null>;

  declare supplier: NonAttribute<Supplier>;
  declare goodReceiptStatusHistory: NonAttribute<OrderStatusHistory[]>;
  declare goodReceiptLines: NonAttribute<GoodReceiptLine[]>;
  declare returnTransactions: NonAttribute<ReturnTransaction[]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

GoodReceipt.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "DRAFT",
    },
    receiptDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    cancellationReason: {
      type: DataTypes.TEXT,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    referenceNo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    internalNotes: {
      type: DataTypes.TEXT,
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
    modelName: "GoodReceipt",
    tableName: "GoodReceipts",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["updatedAt"] },
    },
  },
);

export default GoodReceipt;
