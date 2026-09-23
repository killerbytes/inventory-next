import { ProductCombinationData } from "@/schemas";
import { DATE_FORMAT, DATETIME_FORMAT } from "@/types/definitions";
import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const getInitials = (name: string) => {
  if (!name) return "";
  const names = name.split(" ");
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[1].substring(0, 1).toUpperCase();
  }
  return initials;
};

export const formatCurrency = (value: number) => {
  if (Number(value) === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_CURRENCY || process.env.CURRENCY || "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (value?: string | Date | null) => {
  return value ? format(value, DATE_FORMAT) : "";
};

export const formatDateTime = (
  value?: string | Date | null,
  formatStr: string = DATETIME_FORMAT,
) => {
  return value ? format(value, formatStr) : "";
};

export const getScore = (value: string, search: string) => {
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9 ]/gi, " ")
      .trim();

  const v = normalize(value);
  const s = normalize(search);

  if (!s) return 1;

  if (v === s) return 100;
  if (v.startsWith(s)) return 80;
  if (v.includes(s)) return 50;

  const searchWords = s.split(/\s+/).filter(Boolean);
  let matched = 0;
  for (const word of searchWords) {
    if (v.includes(word)) matched++;
  }

  if (matched === searchWords.length) return 40;
  if (matched > 0) return 20;

  return 0;
};

export interface FooterTotals {
  totalAmount: number;
  totalPrice: number;
  totalDiscount: number;
}

interface ProductCombinationWithSubItem extends ProductCombinationData {
  subItem?: ProductCombinationWithSubItem[];
}

export const groupSubItems = (
  items: ProductCombinationData[],
): ProductCombinationWithSubItem[] => {
  const itemRecord: Record<number, ProductCombinationWithSubItem> = {};
  items.forEach((item) => {
    itemRecord[item.id] = {
      ...item,
      subItem: undefined,
    };
  });
  const rootItems: ProductCombinationWithSubItem[] = [];
  Object.values(itemRecord).forEach((item) => {
    const parentId = item.isBreakPackOfId;
    if (parentId && itemRecord[parentId]) {
      itemRecord[parentId].subItem = [item];
    } else {
      rootItems.push(item);
    }
  });

  return rootItems;
};

export const mappedStatusHistory = (
  statusHistory?: any[],
): Record<string, any> => {
  const map: Record<string, any> = {};
  (statusHistory || []).forEach((item) => {
    if (item && item.status) {
      map[item.status] = item;
    }
  });
  return map;
};
