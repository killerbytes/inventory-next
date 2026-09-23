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
import InvoiceLine from "./InvoiceLine";

export class Invoice extends Model<
  InferAttributes<Invoice>,
  InferCreationAttributes<Invoice>
> {
  declare id: CreationOptional<number>;
  declare supplierId: CreationOptional<number>;
  declare invoiceNumber: string;
  declare invoiceDate: CreationOptional<Date>;
  declare dueDate: Date | null;
  declare status: CreationOptional<string>;
  declare totalAmount: number;
  declare notes: CreationOptional<string | null>;
  declare changedBy: CreationOptional<number | null>;

  declare invoiceLines: NonAttribute<InvoiceLine[]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Invoice.init(
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
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "DRAFT",
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    changedBy: {
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
    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: "Invoice",
    tableName: "Invoices",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

export default Invoice;
