import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class CombinationValue extends Model<
  InferAttributes<CombinationValue>,
  InferCreationAttributes<CombinationValue>
> {
  declare combinationId: number;
  declare variantValueId: number;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

CombinationValue.init(
  {
    combinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    variantValueId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    modelName: "CombinationValue",
    tableName: "CombinationValues",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

export default CombinationValue;
