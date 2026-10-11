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
