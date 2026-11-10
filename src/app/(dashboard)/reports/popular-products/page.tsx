import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import PopularProductsClientWidget from "@/components/widgets/PopularProductsClientWidget";
import { PAGINATION } from "@/constants";
import { getBusinessCalendar } from "@/server/services/dateFilter";
import { Pagination } from "@/types";

export const dynamic = "force-dynamic";

export default async function PopularProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  let products: any[] = [];
  let pagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Business-timezone month; the server clock can still be on last month's date.
  const { monthStart: defaultStartDate, monthEnd: defaultEndDate } =
    getBusinessCalendar();

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;
  try {



    const result = await reportsServerService.getPopularProducts({
      limit,
      page,
      offset,
      startDate,
      endDate,
    });

    products = result?.data || [];
    pagination = result?.pagination || [];
  } catch (err) {
    console.error("Error fetching popular products:", err);
    products = [];
  }
  return <PopularProductsClientWidget initialProducts={products}
    initialPagination={pagination}
    startDate={startDate}
    endDate={endDate}
  />;
}
