"use client";

import React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PAGINATION } from "@/types/definitions";
import { useIsMobile } from "@/hooks/use-mobile";

export interface FilterProps {
  limit?: number;
  page?: number;
  [key: string]: any;
}

export interface PagerMeta {
  total?: number;
  totalPages?: number;
  currentPage?: number;
}

export interface PagerProps<T extends FilterProps = FilterProps> {
  meta?: PagerMeta;
  filter?: T;
  setFilter?: React.Dispatch<React.SetStateAction<T>> | ((action: any) => void);
  paramNames?: {
    page?: string;
    limit?: string;
  };
}

export default function Pager<T extends FilterProps = FilterProps>({
  meta,
  filter,
  setFilter,
  paramNames,
}: PagerProps<T>) {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() || "";

  const pageParamKey = paramNames?.page || "page";
  const limitParamKey = paramNames?.limit || "limit";

  const urlPage = searchParams ? Number(searchParams.get(pageParamKey)) : NaN;
  const urlLimit = searchParams ? Number(searchParams.get(limitParamKey)) : NaN;

  const page =
    !isNaN(urlPage) && urlPage > 0
      ? urlPage
      : filter?.page || meta?.currentPage || 1;

  const limit =
    !isNaN(urlLimit) && urlLimit > 0
      ? urlLimit
      : filter?.limit || PAGINATION.PAGE_SIZE;

  const pageCount = meta?.totalPages || 1;

  const paginationLimits = PAGINATION.PAGE_SIZE_OPTIONS.map((i) => ({
    label: String(i),
    value: i,
  }));

  const createPageUrl = (targetPage: number, targetLimit?: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set(pageParamKey, String(targetPage));
    if (targetLimit !== undefined) {
      params.set(limitParamKey, String(targetLimit));
    }
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const handlePageChange = (targetPage: number) => {
    const nextUrl = createPageUrl(targetPage);
    router.push(nextUrl, { scroll: false });
    if (setFilter) {
      setFilter((prev: any) => ({
        ...(prev || {}),
        page: targetPage,
      }));
    }
  };

  const handleLimitChange = (targetLimit: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set(limitParamKey, String(targetLimit));
    params.set(pageParamKey, "1");
    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(nextUrl, { scroll: false });
    if (setFilter) {
      setFilter((prev: any) => ({
        ...(prev || {}),
        limit: targetLimit,
        page: 1,
      }));
    }
  };

  const getVisiblePages = () => {
    const visiblePages = [];
    const maxVisible = isMobile ? 3 : 5;

    if (pageCount <= maxVisible) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(pageCount, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      visiblePages.push(1);
      if (start > 2) {
        visiblePages.push(-1);
      }
    }

    for (let i = start; i <= end; i++) {
      visiblePages.push(i);
    }

    if (end < pageCount) {
      if (end < pageCount - 1) {
        visiblePages.push(-1);
      }
      visiblePages.push(pageCount);
    }

    return visiblePages;
  };

  return (
    <Pagination className="relative flex-col md:flex-row gap-2 items-center justify-between my-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page:</span>
        <select
          value={String(limit)}
          onChange={(e) => {
            handleLimitChange(Number(e.target.value));
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs cursor-pointer"
        >
          {paginationLimits.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <PaginationContent className="justify-center">
        <PaginationItem>
          <PaginationPrevious
            href={page > 1 ? createPageUrl(page - 1) : "#"}
            aria-disabled={page === 1}
            className={page === 1 ? "pointer-events-none opacity-50" : ""}
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) {
                handlePageChange(page - 1);
              }
            }}
            isActive={page !== 1}
          />
        </PaginationItem>
        {getVisiblePages().map((p, index) => (
          <PaginationItem key={index}>
            {p === -1 ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href={createPageUrl(p)}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(p);
                }}
                isActive={p === page}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href={page < pageCount ? createPageUrl(page + 1) : "#"}
            aria-disabled={page === pageCount}
            className={
              page >= pageCount ? "pointer-events-none opacity-50" : ""
            }
            onClick={(e) => {
              e.preventDefault();
              if (page < pageCount) {
                handlePageChange(page + 1);
              }
            }}
            isActive={page !== pageCount}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
