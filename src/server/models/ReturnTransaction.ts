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
import ReturnItem from "./ReturnItem";

export class ReturnTransaction extends Model<
  InferAttributes<ReturnTransaction>,
  InferCreationAttributes<ReturnTransaction>
> {
  declare id: CreationOptional<number>;
  declare sourceType: string;
  declare referenceId: number;
  declare totalReturnAmount: CreationOptional<number>;
  declare totalExchangeAmount: CreationOptional<number | null>;
  declare paymentDifference: CreationOptional<number>;
  declare type: CreationOptional<string>;

  declare returnItems: NonAttribute<ReturnItem[]>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ReturnTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sourceType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalReturnAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalExchangeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    paymentDifference: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "RETURN",
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
    modelName: "ReturnTransaction",
    tableName: "ReturnTransactions",
    timestamps: true,
    defaultScope: {
      attributes: { exclude: ["createdAt"] },
    },
  },
);

export default ReturnTransaction;
