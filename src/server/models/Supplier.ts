import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class Supplier extends Model<
  InferAttributes<Supplier>,
  InferCreationAttributes<Supplier>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare contact: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
  declare phone: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  declare notes: CreationOptional<string | null>;
  declare isActive: CreationOptional<boolean>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Supplier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contact: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.TEXT,
    },
    address: {
      type: DataTypes.STRING,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    modelName: "Supplier",
    tableName: "Suppliers",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
    indexes: [
      {
        unique: true,
        fields: ["email"],
        where: {
          deletedAt: null,
        },
      },
    ],
  },
);

export default Supplier;
