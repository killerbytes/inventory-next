/**
 * Mapped combination and variant display utilities matching inventory-api src/utils/mapped.js 1:1.
 */

export function getMappedVariantValues(
  variants: any[] = [],
  values: any[] = [],
): Record<string, string> {
  const mappedVariantValues: Record<string, string> = {};
  if (!Array.isArray(variants) || !Array.isArray(values))
    return mappedVariantValues;

  variants.forEach((val) => {
    const found = values.find(
      (v) =>
        v.variantTypeId === val.id ||
        v.variantTypeId === Number(val.id) ||
        v.variantValueId === val.id,
    );
    if (found) {
      mappedVariantValues[val.name] = found.value || "";
    }
  });

  return mappedVariantValues;
}

export function getMappedProductComboName(
  product: any,
  values: any[] = [],
): string {
  const mapped = getMappedVariantValues(product?.variants || [], values);

  const keys = Object.keys(mapped);
  if (keys.length === 0 && Array.isArray(values) && values.length > 0) {
    const fallbackVals = values.map((v) => v.value || v.name).filter(Boolean);
    return fallbackVals.length > 0
      ? `${product?.name || "Product"} - ${fallbackVals.join(" | ")}`
      : product?.name || "Product";
  }

  const mergedParts: string[] = [];
  const remainingParts: string[] = [];
  const usedKeys = new Set<string>();

  keys.forEach((key) => {
    if (usedKeys.has(key)) return;

    if (key.includes("_")) {
      const [base] = key.split("_");
      if (mapped[base]) {
        mergedParts.push(`${mapped[base]} x ${mapped[key]}`);
        usedKeys.add(base);
        usedKeys.add(key);
        return;
      }
    }
  });

  keys
    .filter((key) => !usedKeys.has(key))
    .sort()
    .forEach((key) => remainingParts.push(mapped[key]));

  const outputParts = [...mergedParts, ...remainingParts];

  if (outputParts.length === 0) {
    return product?.name || "Product";
  }

  return `${product?.name || "Product"} - ${outputParts.join(" | ")}`;
}
