import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import NoSalesClientWidget from "@/components/widgets/NoSalesClientWidget";
import { PAGINATION } from "@/types/definitions";

export const dynamic = "force-dynamic";

export default async function NoSalesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const sort = (params.sort as any) || "quantity";
  const order = (params.order as "ASC" | "DESC") || "DESC";
  const q = params.q || undefined;

  let result = {
    data: [],
    meta: {
      total: 0,
      totalPages: 1,
      currentPage: page,
    },
  };

  try {
    const response = await reportsServerService.getNoSales({
      page,
      limit,
      sort,
      order,
      q,
    });
    if (response) {
      result = response as any;
    }
  } catch (err) {
    console.error("Error fetching no sales report:", err);
  }

  return (
    <NoSalesClientWidget
      initialProducts={JSON.parse(JSON.stringify(result.data || []))}
      meta={result.meta}
    />
  );
}

