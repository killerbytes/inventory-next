import { RETURN_TYPE } from "@/constants";

/**
 * Utility functions for monetary and quantity calculations, matching inventory-api 1:1.
 */

export interface ComputableItem {
  purchasePrice: number;
  quantity: number;
  discount?: number | null | undefined;
}

/**
 * Calculates line item amount taking optional discount into account.
 * (price * quantity) - discount
 */
export function getAmount(item: ComputableItem): number {
  const price = Number(item.purchasePrice ?? 0);
  const qty = Number(item.quantity || 0);
  const discount = Number(item.discount || 0);
  return price * qty - discount;
}

/** Tolerance matching the DB's numeric scale of 6, so float sums like 0.1 * 3 compare equal. */
const AMOUNT_EPSILON = 1e-6;

/**
 * A line discount must satisfy 0 <= discount <= price * quantity.
 * A negative discount silently charges above list price; one above the gross amount yields a
 * negative line total and, on goods receipts, drags the weighted average cost below zero.
 * A 100% discount (free line) is allowed.
 */
export function isDiscountWithinLineAmount(item: ComputableItem): boolean {
  const discount = Number(item.discount ?? 0);
  if (!Number.isFinite(discount) || discount < 0) return false;
  const gross = Number(item.purchasePrice ?? 0) * Number(item.quantity || 0);
  return discount <= gross + AMOUNT_EPSILON;
}

/**
 * Sums total amount across an array of line items.
 */
export function getTotalAmount(items: ComputableItem[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + getAmount(item), 0);
}

/**
 * Normalizes a number to fixed decimal precision (default 4 places for prices/costs).
 */
export function normalize(
  value: number | string,
  precision: number = 4,
): number {
  return Number(Number(value || 0).toFixed(precision));
}

/**
 * Truncates a floating-point quantity to a fixed precision without rounding up (default 6 places),
 * using an epsilon buffer to eliminate IEEE-754 binary floating-point representation artifacts.
 */
export function truncateQty(
  value: number | string,
  precision: number = 6,
): number {
  const num = Number(value || 0);
  if (isNaN(num) || num === 0) return 0;
  const factor = 10 ** precision;
  // Epsilon offset prevents numbers like 1.14 (stored as 1.1399999999999999) from truncating downwards
  const epsilon = (num >= 0 ? 1 : -1) * 1e-11;
  return Math.trunc(num * factor + epsilon) / factor;
}

export interface SalesOrderSummary {
  grossSubtotal: number;
  totalDiscount: number;
  saleAmount: number;
  totalReturnAmount: number;
  totalExchangeAmount: number;
  grandTotal: number;
}

/**
 * Computes financial ledger summary for a sales order including returns and exchanges.
 */
export function computeSalesOrderSummary(order: {
  totalAmount?: number | string | null;
  salesOrderItems?: any[];
  returnTransactions?: any[];
}): SalesOrderSummary {
  let grossSubtotal = 0;
  let totalDiscount = 0;

  (order.salesOrderItems || []).forEach((item: any) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.purchasePrice ?? item.originalPrice ?? 0);
    const disc = Number(item.discount || 0);
    grossSubtotal += qty * price;
    totalDiscount += disc;
  });

  let totalReturnAmount = 0;
  let totalExchangeAmount = 0;

  (order.returnTransactions || []).forEach((tx: any) => {
    if (
      tx.totalReturnAmount !== undefined &&
      tx.totalReturnAmount !== null &&
      tx.totalExchangeAmount !== undefined &&
      tx.totalExchangeAmount !== null
    ) {
      totalReturnAmount += Number(tx.totalReturnAmount || 0);
      totalExchangeAmount += Number(tx.totalExchangeAmount || 0);
    } else {
      (tx.returnItems || []).forEach((ri: any) => {
        const lineTotal =
          Number(ri.quantity || 0) * Number(ri.price || 0) -
          Number(ri.discount || 0);
        if (ri.type === RETURN_TYPE.RETURN_IN || ri.type === "RETURN_IN") {
          totalReturnAmount += lineTotal;
        } else if (
          ri.type === RETURN_TYPE.EXCHANGE_IN ||
          ri.type === "EXCHANGE_IN" ||
          ri.type === "EXCHANGE_OUT"
        ) {
          totalExchangeAmount += lineTotal;
        }
      });
    }
  });

  const saleAmount = Number(
    order.totalAmount !== undefined && order.totalAmount !== null
      ? order.totalAmount
      : grossSubtotal - totalDiscount
  );
  const grandTotal = saleAmount - totalReturnAmount + totalExchangeAmount;

  return {
    grossSubtotal,
    totalDiscount,
    saleAmount,
    totalReturnAmount,
    totalExchangeAmount,
    grandTotal,
  };
}
