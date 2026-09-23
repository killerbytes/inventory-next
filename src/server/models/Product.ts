import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import sequelize from "../db/sequelize";
import { getSKU } from "@/lib/string";

export class Product extends Model<
  InferAttributes<Product>,
  InferCreationAttributes<Product>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare baseUnit: string;
  declare categoryId: number;
  declare sku: CreationOptional<string | null>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Product.init(
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
    description: {
      type: DataTypes.TEXT,
    },
    baseUnit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING,
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
    modelName: "Product",
    tableName: "Products",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
    },
    indexes: [
      {
        unique: true,
        fields: ["name", "baseUnit"],
        where: {
          deletedAt: null,
        },
      },
    ],
  },
);

Product.beforeCreate(async (product) => {
  product.sku = getSKU(product.name, product.categoryId);
});

Product.beforeBulkCreate(async (products) => {
  for (const product of products) {
    product.sku = getSKU(product.name, product.categoryId);
  }
});

Product.beforeUpdate(async (product) => {
  product.sku = getSKU(product.name, product.categoryId);
});

export default Product;
