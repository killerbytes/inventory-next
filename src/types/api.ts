export interface Summary {
  label: string;
  value: number;
}

export type Pagination = {
  total: number;
  totalPages: number;
  currentPage: number;
};

export type Meta = Pagination;

export type PaginatedResponse<T extends object, S = object> = {
  data: T[];
  pagination: Pagination;
  summary?: S;
};

export interface filterProps {
  limit?: number;
  page?: number;
  q?: string;
  type?: string;
  sort?: string;
  status?: string;
  order?: "ASC" | "DESC";
  startDate?: Date;
  endDate?: Date;
}

export type GoodReceiptSummary = {
  totalAmount: number;
  totalPayableAmount: number;
  totalReturnAmount: number;
};

export type SalesOrderSummary = {
  totalAmount: number;
  totalProfitAmount: number;
  totalReturnAmount: number;
  totalExchangeAmount: number;
};

/** Outcome of checking whether a receipt number is already taken by another order. */
export type ReceiptNumberCheck = {
  existing: {
    id: number;
    orderDate: Date | string | null;
    customerName: string | null;
    totalAmount: string;
  } | null;
  /** The same receipt number with a free booklet code; null when there is no conflict. */
  suggestion: string | null;
};

/**
 * Standard Result contract for Server Actions preventing Next.js production error masking.
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

