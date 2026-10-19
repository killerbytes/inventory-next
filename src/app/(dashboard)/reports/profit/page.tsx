import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import ProfitClientWidget from "@/components/widgets/ProfitClientWidget";
import { PAGINATION } from "@/constants";

export const dynamic = "force-dynamic";

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const startDate = params.startDate || null;
  const endDate = params.endDate || null;
  const sort = params.sort || "profit";
  const order = (params.order as "ASC" | "DESC") || "DESC";

  let summary = {
    totalSales: 0,
    estimatedCost: 0,
    netProfit: 0,
    marginPercentage: "0.0",
  };

  let productsResult = {
    data: [],
    meta: {
      total: 0,
      totalPages: 1,
      currentPage: page,
    },
  };

  try {
    const [summaryRes, productsRes] = await Promise.all([
      reportsServerService.getProfitSummary({ startDate, endDate }),
      reportsServerService.getProfitProducts({
        page,
        limit,
        startDate,
        endDate,
        sort,
        order,
      }),
    ]);

    if (summaryRes) {
      summary = summaryRes;
    }
    if (productsRes) {
      productsResult = productsRes as any;
    }
  } catch (err) {
    console.error("Error fetching profit report data:", err);
  }

  return (
    <ProfitClientWidget
      initialSummary={summary}
      initialProducts={JSON.parse(JSON.stringify(productsResult.data || []))}
      meta={productsResult.meta}
    />
  );
}
