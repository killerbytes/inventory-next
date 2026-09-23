import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import sequelize from "../db/sequelize";

export class Category extends Model<
  InferAttributes<Category>,
  InferCreationAttributes<Category>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare order: CreationOptional<number | null>;
  declare parentId: CreationOptional<number | null>;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    order: {
      type: DataTypes.INTEGER,
    },
    parentId: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    tableName: "Categories",
    timestamps: false,
  },
);

export default Category;
