/**
 * Pre-printed receipt booklets restart their numbering, so receipts from the second
 * booklet onward carry a booklet code (`B2-0001`) to keep order numbers unique.
 */
const BOOKLET_CODE = /^B(\d+)-/i;

/** Booklet 1 is the original booklet, whose numbers carry no code. */
export const getBookletCode = (receiptNumber?: string | null) =>
  Number(receiptNumber?.match(BOOKLET_CODE)?.[1] ?? 1);

export const getBookletPrefix = (receiptNumber?: string | null) =>
  receiptNumber?.match(BOOKLET_CODE)?.[0].toUpperCase() ?? "";

export const withBookletCode = (receiptNumber: string, code: number) =>
  `B${code}-${receiptNumber.replace(BOOKLET_CODE, "")}`;

/** True for a prefilled code whose receipt number was never typed, e.g. `B2-`. */
export const isBookletCodeOnly = (receiptNumber?: string | null) =>
  /^B\d+-$/i.test(receiptNumber?.trim() ?? "");
