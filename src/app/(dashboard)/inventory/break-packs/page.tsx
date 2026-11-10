import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import BreakPacksWidget from "@/components/widgets/BreakPacksWidget";
import { PAGINATION } from "@/constants";
import { getBusinessCalendar } from "@/server/services/dateFilter";
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
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Business-timezone month; the server clock can still be on last month's date.
  const { monthStart: defaultStartDate, monthEnd: defaultEndDate } =
    getBusinessCalendar();

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let initialRows: BreakPackRow[] = [];
  let initialPagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  const result = await reportsServerService.getBreakPacks({
    limit,
    offset,
  });
  initialRows = result.rows;
  initialPagination = result.pagination;

  return <BreakPacksWidget initialBreakPacks={initialRows}

    initialPagination={initialPagination}

  />;
}
