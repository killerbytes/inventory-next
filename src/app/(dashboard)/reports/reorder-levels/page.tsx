import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import ReorderLevelsClientWidget from "@/components/widgets/ReorderLevelsClientWidget";
import { PAGINATION } from "@/constants";

export const dynamic = "force-dynamic";

export default async function ReorderLevelsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const sort = (params.sort as any) || "lastSoldAt";
  const order = (params.order as "ASC" | "DESC") || "DESC";

  let result = {
    data: [],
    meta: {
      total: 0,
      totalPages: 1,
      currentPage: page,
    },
  };

  try {
    const response = await reportsServerService.getReorderLevels({
      page,
      limit,
      sort,
      order,
    });
    if (response) {
      result = response as any;
    }
  } catch (err) {
    console.error("Error fetching reorder levels:", err);
  }

  return (
    <ReorderLevelsClientWidget
      initialData={JSON.parse(JSON.stringify(result.data || []))}
      meta={result.meta}
    />
  );
}

