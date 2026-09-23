import pg from "pg";
import { Sequelize } from "sequelize";
import "server-only";

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT);
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !port || !username || !password || !database) {
  throw new Error("Missing database configuration");
}

export const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
