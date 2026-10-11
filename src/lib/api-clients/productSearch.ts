import { searchProductCombinationsAction } from "@/server/actions/product.actions";

/**
 * Searches product combinations by keyword with in-memory tokenized matching.
 */
export const getMappedSearchProductCombinations = async (params: {
  search: string;
  limit?: number;
  noBreakPacks?: boolean;
}) => {
  const { search } = params;
  if (!search || search.length < 2) {
    return [];
  }

  const response = await searchProductCombinationsAction({
    limit: params.limit ?? 20,
    ...params,
  });
  const searchResults = Array.isArray(response)
    ? response
    : Array.isArray((response as any)?.data)
      ? (response as any).data
      : [];
  const result: any[] = [];
  const words = search
    .toLowerCase()
    .replace(/[-_()]/g, " ")
    .split(/\s+/)
    .filter((i) => i.length > 0);

  for (const item of searchResults) {
    const isMatch = words.some((word) =>
      item.description?.toLowerCase().includes(word),
    );

    const combinations = isMatch
      ? (item.combinations || []).map((i: any) => ({
        ...i,
        name: `${i.name} ***${item.description}***`,
        product: item,
      }))
      : (item.combinations || []).map((i: any) => ({
        ...i,
        product: item,
      }));

    const filtered = (combinations ?? []).filter((i: any) => {
      const name = (i.name || "").toLowerCase();
      return words.every((word) => name.includes(word));
    });
    result.push(...filtered);
  }

  return result;
};
