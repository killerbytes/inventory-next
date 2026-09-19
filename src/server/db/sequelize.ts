import "server-only";
import { Sequelize } from "sequelize";
import pg from "pg";

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT) || 5432;
const username = process.env.DB_USERNAME || "postgres";
const password = process.env.DB_PASSWORD || "killer";
const database = process.env.DB_NAME || "inventory_db";

export const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
