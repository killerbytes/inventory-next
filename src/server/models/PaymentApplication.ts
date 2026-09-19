import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class PaymentApplication extends Model<
  InferAttributes<PaymentApplication>,
  InferCreationAttributes<PaymentApplication>
> {
  declare id: CreationOptional<number>;
  declare paymentId: CreationOptional<number | null>;
  declare invoiceId: CreationOptional<number | null>;
  declare amountApplied: CreationOptional<number | null>;
  declare amountRemaining: CreationOptional<number | null>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

PaymentApplication.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    amountApplied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    amountRemaining: {
      type: DataTypes.DECIMAL(10, 2),
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
    modelName: "PaymentApplication",
    tableName: "PaymentApplications",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
  },
);

export default PaymentApplication;
