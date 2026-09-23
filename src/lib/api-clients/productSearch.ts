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
    const combinations = (item.combinations || []).map((i: any) => {
      return {
        ...i,
        product: item,
      };
    });

    const filtered = (combinations ?? []).filter((i: any) => {
      const textToSearch = `${i.name || ""} ${item.name || ""} ${
        item.description || ""
      }`
        .toLowerCase()
        .replace(/[-_()]/g, " ");

      return words.every((word) => textToSearch.includes(word));
    });

    result.push(...filtered);
  }

  return result;
};
