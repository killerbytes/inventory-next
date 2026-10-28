import { describe, expect, it } from "vitest";
import { salesInvoiceMigrationSql } from "../../scripts/migrate-sales-invoices.cjs";

describe("Sales Invoice DDL Migration Script (Unit)", () => {
  it("should contain idempotent CREATE TABLE and SEQUENCE statements for SalesInvoices", () => {
    expect(salesInvoiceMigrationSql).toContain('CREATE TABLE IF NOT EXISTS "SalesInvoices"');
    expect(salesInvoiceMigrationSql).toContain('CREATE TABLE IF NOT EXISTS "SalesInvoiceLines"');
    expect(salesInvoiceMigrationSql).toContain('CREATE SEQUENCE IF NOT EXISTS "sales_invoice_seq"');
  });

  it("should define all required schema columns and constraints", () => {
    // SalesInvoices columns
    expect(salesInvoiceMigrationSql).toContain('"customerId" INTEGER NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"invoiceNumber" VARCHAR(255) NOT NULL UNIQUE');
    expect(salesInvoiceMigrationSql).toContain('"invoiceDate" TIMESTAMPTZ NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"status" VARCHAR(50) DEFAULT \'DRAFT\' NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"previousBalance" NUMERIC(10, 2) DEFAULT \'0\' NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"totalCharges" NUMERIC(10, 2) NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"totalPayments" NUMERIC(10, 2) DEFAULT \'0\' NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"amountDue" NUMERIC(10, 2) NOT NULL');

    // SalesInvoiceLines columns and foreign keys
    expect(salesInvoiceMigrationSql).toContain('"salesInvoiceId" INTEGER NOT NULL REFERENCES "SalesInvoices"("id")');
    expect(salesInvoiceMigrationSql).toContain('"salesOrderId" INTEGER NOT NULL REFERENCES "SalesOrders"("id")');
    expect(salesInvoiceMigrationSql).toContain('"charges" NUMERIC(10, 2) DEFAULT \'0\' NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"payments" NUMERIC(10, 2) DEFAULT \'0\' NOT NULL');
    expect(salesInvoiceMigrationSql).toContain('"balance" NUMERIC(10, 2) DEFAULT \'0\' NOT NULL');
  });
});
