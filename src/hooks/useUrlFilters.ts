"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";

export interface UrlFilters {
  page: number;
  limit: number;
  q: string;
  status: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  order?: "ASC" | "DESC";
  [key: string]: any;
}

export function useUrlFilters(defaults: Partial<UrlFilters> = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: UrlFilters = useMemo(() => {
    const page = Number(searchParams?.get("page")) || defaults.page || 1;
    const limit = Number(searchParams?.get("limit")) || defaults.limit || 25;
    const q = searchParams?.get("q") || defaults.q || "";
    const status = searchParams?.get("status") || defaults.status || "ALL";
    const startDate = searchParams?.get("startDate") || defaults.startDate || undefined;
    const endDate = searchParams?.get("endDate") || defaults.endDate || undefined;
    const sort = searchParams?.get("sort") || defaults.sort || undefined;
    const order = (searchParams?.get("order") as "ASC" | "DESC") || defaults.order || "DESC";

    return {
      page,
      limit,
      q,
      status,
      startDate,
      endDate,
      sort,
      order,
    };
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (newFilters: Partial<UrlFilters> | ((prev: UrlFilters) => Partial<UrlFilters>)) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      const updated =
        typeof newFilters === "function" ? newFilters(filters) : newFilters;

      Object.entries(updated).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "" || val === "ALL") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });

      const queryString = params.toString();
      const newPath = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newPath, { scroll: false });
    },
    [searchParams, pathname, router, filters]
  );

  return { filters, setFilters };
}
