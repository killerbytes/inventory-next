/**
 * Utility functions for monetary and quantity calculations, matching inventory-api 1:1.
 */

import { ProductCombinationUpdate } from "@/schemas";

export interface ComputableItem {
  purchasePrice?: number;
  quantity: number;
  discount?: number | string | null;
  combination?: ProductCombinationUpdate;
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
 * Truncates a floating-point quantity to a fixed precision without rounding up (default 6 places).
 */
export function truncateQty(
  value: number | string,
  precision: number = 6,
): number {
  const num = Number(value || 0);
  const factor = 10 ** precision;
  return Math.trunc(num * factor) / factor;
}
