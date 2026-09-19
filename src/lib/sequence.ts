/**
 * Database sequence utility matching inventory-api src/utils/services/getNextSequence.js 1:1.
 */
import { QueryTypes, Sequelize } from "sequelize";

export async function getNextSequence(name: string, sequelizeInstance: Sequelize): Promise<number> {
  const dialect = sequelizeInstance.getDialect();

  if (dialect === "postgres") {
    await sequelizeInstance.query(`CREATE SEQUENCE IF NOT EXISTS "${name}" START 1;`);
    const [[{ nextval }]] = (await sequelizeInstance.query(`SELECT nextval('"${name}"');`)) as any;
    return Number(nextval);
  }

  if (dialect === "sqlite") {
    await sequelizeInstance.query(`
      CREATE TABLE IF NOT EXISTS Sequences (
        name TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
      )
    `);

    await sequelizeInstance.query(
      `
      INSERT INTO Sequences(name, value)
      VALUES(:name, 1)
      ON CONFLICT(name) DO UPDATE SET value = value + 1
      `,
      {
        replacements: { name },
        type: QueryTypes.INSERT,
      }
    );

    const [row] = (await sequelizeInstance.query(
      `SELECT value FROM Sequences WHERE name = :name`,
      {
        replacements: { name },
        type: QueryTypes.SELECT,
      }
    )) as any[];

    return row ? Number(row.value) : 1;
  }

  throw new Error(`Unsupported dialect: ${dialect}`);
}
