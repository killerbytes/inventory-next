#!/usr/bin/env node
/**
 * Migration Script: Create SalesInvoices and SalesInvoiceLines tables
 *
 * Usage:
 *   node scripts/migrate-sales-invoices.cjs
 */

const path = require("path");
const fs = require("fs");
const { Client } = require("pg");

// Load .env.development if present, else fallback to standard env
const envDevPath = path.resolve(process.cwd(), ".env.development");
if (fs.existsSync(envDevPath)) {
  require("dotenv").config({ path: envDevPath });
} else {
  require("dotenv").config();
}

const salesInvoiceMigrationSql = `
CREATE TABLE IF NOT EXISTS "SalesInvoices" (
  "id" SERIAL PRIMARY KEY,
  "customerId" INTEGER NOT NULL,
  "invoiceNumber" VARCHAR(255) NOT NULL UNIQUE,
  "invoiceDate" TIMESTAMPTZ NOT NULL,
  "dueDate" TIMESTAMPTZ,
  "status" VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  "previousBalance" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
  "totalCharges" NUMERIC(10, 2) NOT NULL,
  "totalPayments" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
  "amountDue" NUMERIC(10, 2) NOT NULL,
  "notes" TEXT,
  "changedBy" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "SalesInvoiceLines" (
  "id" SERIAL PRIMARY KEY,
  "salesInvoiceId" INTEGER NOT NULL REFERENCES "SalesInvoices"("id") ON DELETE CASCADE,
  "salesOrderId" INTEGER NOT NULL REFERENCES "SalesOrders"("id"),
  "orderDate" TIMESTAMPTZ,
  "refNo" VARCHAR(255),
  "description" TEXT,
  "charges" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
  "payments" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
  "balance" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS "sales_invoice_seq" START 1;
`;

async function runMigration() {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "killer";
  const database = process.env.DB_NAME || "inventory_db";
  const port = parseInt(process.env.DB_PORT || "5432", 10);

  console.log(`Connecting to ${database} on ${host}:${port} as ${user}...`);

  const client = new Client({
    host,
    user,
    password,
    database,
    port,
  });

  try {
    await client.connect();
    console.log("Connected successfully. Executing migration SQL...");
    await client.query(salesInvoiceMigrationSql);
    console.log("Migration executed successfully. Tables 'SalesInvoices' and 'SalesInvoiceLines' are ready.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = {
  salesInvoiceMigrationSql,
  runMigration,
};
