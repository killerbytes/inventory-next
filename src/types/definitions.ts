import { formatLabel, titleCase } from "@/lib/string";

export { ROUTES } from "@/lib/routes";

export const MAX_START_DATE = "2025-08-12";

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  USER: "USER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_OPTIONS = Object.values(UserRole).map((value) => ({
  value,
  label: titleCase(value.toLowerCase()),
}));

export const ORDER_TYPE = {
  SALE: "SALE",
  PURCHASE: "PURCHASE",
};

export const INVENTORY_MOVEMENT_TYPE = {
  ALL: "ALL",
  IN: "IN",
  OUT: "OUT",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  RETURN_IN: "RETURN_IN",
  CANCELLATION: "CANCELLATION",
  BREAK_PACK_IN: "BREAK_PACK_IN",
  BREAK_PACK_OUT: "BREAK_PACK_OUT",
  RE_PACK_IN: "RE_PACK_IN",
  RE_PACK_OUT: "RE_PACK_OUT",
  EXCHANGE_IN: "EXCHANGE_IN",
  EXCHANGE_OUT: "EXCHANGE_OUT",
  SUPPLIER_RETURN_OUT: "SUPPLIER_RETURN_OUT",
};

export const INVENTORY_MOVEMENT_REFERENCE_TYPE = {
  GOOD_RECEIPT: "GOOD_RECEIPT",
  SALES_ORDER: "SALES_ORDER",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  BREAK_PACK: "BREAK_PACK",
} as const;

export const INVENTORY_MOVEMENT_MAP = {
  IN: "IN",
  OUT: "OUT",
  ADJUSTMENT_IN: "ADJUST IN",
  ADJUSTMENT_OUT: "ADJUST OUT",
  RETURN_IN: "RETURN IN",
  CANCELLATION: "CANCELLATION",
  BREAK_PACK_IN: "BREAKPACK IN",
  BREAK_PACK_OUT: "BREAKPACK OUT",
  RE_PACK_IN: "REPACK IN",
  RE_PACK_OUT: "REPACK OUT",
  EXCHANGE_IN: "EXCHANGE IN",
  EXCHANGE_OUT: "EXCHANGE OUT",
  SUPPLIER_RETURN_OUT: "SUPPLIER RETURN OUT",
};

export const INVENTORY_MOVEMENT_TYPE_OPTIONS = Object.values(
  INVENTORY_MOVEMENT_TYPE,
).map((value) => ({
  value,
  label: formatLabel(value),
}));

export const INVENTORY_MOVEMENT_TYPE_COLOR = {
  IN: "bg-orange-500 text-white",
  OUT: "bg-green-500 text-white",
  ADJUSTMENT_IN: "bg-green-500 text-white",
  ADJUSTMENT_OUT: "bg-red-500 text-white",
  RETURN_IN: "text-red-600 border-red-600 bg-red-200",
  SUPPLIER_RETURN_OUT: "text-black border-red-600 bg-green-500",
  EXCHANGE_IN: "bg-red-500 border-black text-black",
  EXCHANGE_OUT: "bg-green-500 border-black text-black",
  CANCELLATION: "text-red-500 border-red-500 bg-red-100",
  BREAK_PACK_IN: "text-gray-500 border-gray-500 bg-gray-100",
  BREAK_PACK_OUT: "text-gray-100 border-gray-100 bg-gray-500",
  RE_PACK_IN: "text-gray-900 border-gray-500 bg-gray-100",
  RE_PACK_OUT: "text-gray-100 border-gray-100 bg-gray-900",
};

export const STATUS_COLOR = {
  VOID: "text-gray-400 border-gray-400 bg-gray-200",
  DRAFT: "text-white border-gray-600 bg-gray-500",
  RECEIVED: "text-orange-600 border-orange-600 bg-orange-100",
  POSTED: "text-orange-600 border-orange-600 bg-orange-100",
  PARTIALLY_PAID: "text-orange-600 border-orange-600 bg-orange-100",
  COMPLETED: "text-green-600 border-green-600 bg-green-100",
  PAID: "text-green-600 border-green-600 bg-green-100",
  CANCELLED: "text-red-600 border-red-600 bg-red-100",
  CASH: "text-green-400 border-green-400",
  CHECK: "text-yellow-500 border-yellow-500",
};

export const PAGINATION = {
  PAGE: 1,
  PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 20, 25, 50, 100],
};

export const DATE_FORMAT = "dd-MMM-yy";
export const DATETIME_FORMAT = "dd-MMM-yy h:mm a";

export const ORDER_STATUS = {
  ALL: "ALL",
  DRAFT: "DRAFT",
  RECEIVED: "RECEIVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  VOID: "VOID",
};

export const ORDER_STATUS_OPTIONS = Object.values(ORDER_STATUS).map(
  (value) => ({
    value,
    label: formatLabel(value),
  }),
);

export const MODE_OF_PAYMENT = {
  CASH: "CASH",
  CHECK: "CHECK",
  EWALLET: "EWALLET",
  BANK: "BANK",
} as const;

export const MODE_OF_PAYMENT_COLOR = {
  CASH: "bg-green-400 text-white",
  CHECK: "bg-yellow-400 text-black",
};

export const MODE_OF_PAYMENT_OPTIONS = Object.values(MODE_OF_PAYMENT).map(
  (value) => ({
    value,
    label: titleCase(value.toLowerCase()),
  }),
);

export const UNIT = {
  PCS: "PCS",
  KGS: "KGS",
  BTL: "BTL",
  RLS: "RLS",
  MTS: "MTS",
  FTS: "FTS",
  LTS: "LTS",
  BOX: "BOX",
  BAG: "BAG",
  GAL: "GAL",
  PCK: "PCK",
  SET: "SET",
  DOZ: "DOZ",
};

export const UNIT_COLOR = {
  undefined: "text-black",
  PCS: "bg-green-100 text-black border-green-500",
  MTS: "bg-pink-100 text-black border-pink-500",
  FTS: "bg-lime-100 text-black border-lime-500",
  KGS: "bg-cyan-200 text-black border-cyan-500",
  LTS: "bg-teal-100 text-black border-teal-500",
  BTL: "bg-lime-100 text-black border-lime-500",
  BOX: "bg-indigo-600 text-white",
  BAG: "bg-yellow-900 text-white",
  GAL: "bg-green-900 text-white",
  PCK: "bg-blue-900 text-white",
  SET: "bg-pink-900 text-white",
  RLS: "bg-purple-900 text-white",
  DOZ: "bg-orange-600 text-white",
};

export const UNIT_OPTIONS = Object.values(UNIT).map((value) => ({
  value,
  label: titleCase(value.toLowerCase()),
}));

export const RETURN_TYPE = {
  RETURN_IN: "RETURN_IN",
  EXCHANGE_IN: "EXCHANGE_IN",
  SUPPLIER_RETURN_OUT: "SUPPLIER_RETURN_OUT",
};

export const STOCK_ADJUSTMENT_TYPE = {
  DAMAGED: "DAMAGED",
  LOST: "LOST",
  EXPIRED: "EXPIRED",
  SAMPLE: "SAMPLE",
  FOUND: "FOUND",
  ERROR_CORRECTION: "ERROR_CORRECTION",
  SUPPLIER_BONUS: "SUPPLIER_BONUS",
  RETURN_TO_STOCK: "RETURN_TO_STOCK",
  OTHER: "OTHER",
};

export const STOCK_ADJUSTMENT_TYPE_OPTIONS = Object.values(
  STOCK_ADJUSTMENT_TYPE,
).map((value) => ({
  value,
  label: formatLabel(value),
}));

export const STOCK_ADJUSTMENT_TYPE_COLOR = {
  DAMAGED: "bg-red-500 text-white",
  LOST: "bg-red-500 text-white",
  EXPIRED: "bg-red-500 text-white",
  FOUND: "bg-green-500 text-white",
  SAMPLE: "bg-green-500 text-white",
  ERROR_CORRECTION: "bg-yellow-500 text-white",
  SUPPLIER_BONUS: "bg-green-500 text-white",
  RETURN_TO_STOCK: "bg-green-500 text-white",
  OTHER: "bg-gray-500 text-white",
};

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
};

export const goodReceiptItemDefault = {
  quantity: 1,
  combinationId: 0,
  discount: 0,
  discountNote: "",
  purchasePrice: 0,
  combination: null,
};

export interface Summary {
  label: string;
  value: number;
}

export type Pagination = {
  total: number;
  totalPages: number;
  currentPage: number;
};

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
