import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import "server-only";
import sequelize from "../db/sequelize";

export class VariantType extends Model<
  InferAttributes<VariantType>,
  InferCreationAttributes<VariantType>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare productId: CreationOptional<number | null>;
  declare isTemplate: CreationOptional<boolean | null>;
  declare isBreakpackFilter: CreationOptional<boolean | null>;

  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

VariantType.init(
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
    productId: {
      type: DataTypes.INTEGER,
    },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isBreakpackFilter: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    modelName: "VariantType",
    tableName: "VariantTypes",
    defaultScope: {
      attributes: { exclude: ["createdAt", "updatedAt"] },
    },
  },
);

VariantType.beforeDestroy(async (variantType, options) => {
  const transactionProvided = Boolean(options && options.transaction);
  const t =
    options?.transaction ||
    (await (variantType.sequelize || sequelize).transaction());

  try {
    const { VariantValue } = (variantType.sequelize || sequelize).models;
    const values = await VariantValue.findAll({
      where: { variantTypeId: variantType.id },
      transaction: t,
    });

    for (const val of values) {
      await val.destroy({ transaction: t });
    }

    if (!transactionProvided) await t.commit();
  } catch (err) {
    if (!transactionProvided) await t.rollback();
    throw err;
  }
});

export default VariantType;
