import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import BreakPacksWidget from "@/components/widgets/BreakPacksWidget";
import { PAGINATION } from "@/constants";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { BreakPackData } from "@/schemas";
import { Pagination } from "@/types";

export const dynamic = "force-dynamic";
type BreakPackRow = Awaited<
  ReturnType<typeof reportsServerService.getBreakPacks>
>["rows"][number];



export default async function BreakPacksPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let initialRows: BreakPackRow[] = [];
  let initialPagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  try {
    const result = await reportsServerService.getBreakPacks({
      limit,
      offset,
    });
    initialRows = result.rows;
    initialPagination = result.pagination;

  } catch (err) {
    console.error("Error fetching break packs on server:", err);
    initialRows = [];
  }

  return <BreakPacksWidget initialBreakPacks={initialRows}

    initialPagination={initialPagination}

  />;
}
