import bcrypt from "bcrypt";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare username: string;
  declare email: CreationOptional<string | null>;
  declare password: string;
  declare isActive: CreationOptional<boolean>;
  declare role: CreationOptional<string>;
  declare refreshToken: CreationOptional<string | null>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;

  static generateHash(password: string) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
  }

  static validatePassword(password: string, hash: string) {
    return bcrypt.compareSync(password, hash);
  }
}

User.init(
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
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "User",
    },
    refreshToken: {
      type: DataTypes.STRING,
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
    modelName: "User",
    tableName: "Users",
    paranoid: true,
    deletedAt: "deletedAt",
    defaultScope: {
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "createdAt",
          "updatedAt",
          "deletedAt",
        ],
      },
    },
    scopes: {
      withPassword: {
        attributes: { include: ["password"] },
      },
      withRefreshToken: {
        attributes: { include: ["refreshToken"] },
      },
    },
  },
);

export default User;
