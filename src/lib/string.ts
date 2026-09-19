/**
 * String and SKU utilities matching inventory-api src/utils/string.js 1:1.
 */

export function shortenNameTo(str: string, length: number = 3): string {
  if (!str) return "";
  const name = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const words = name
    .replace(/[^a-zA-Z0-9 \u00BC-\u00BE\u2150-\u215E]/g, "")
    .split(" ");

  const shortened = words
    .slice(0, 3)
    .map((word) => word.substring(0, length))
    .join("_");

  return shortened.substring(0, 10);
}

export function shortenTitleTo(str: string, length: number = 3): string {
  if (!str) return "";

  const words = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);
  return words.map((word) => word.substring(0, length)).join("_");
}

const FRACTION_MAP: Record<string, string> = {
  "¼": "025",
  "½": "050",
  "¾": "075",
  "1/2": "050",
  "1/4": "025",
  "3/32": "332",
  "1/8": "118",
};

export function getSKU(
  name: string,
  category: number | string,
  unit?: string,
  values?: any[],
  suffix: string = ""
): string {
  const preProcess = (str: any) => {
    let processed = String(str || "");
    Object.keys(FRACTION_MAP).forEach((key) => {
      processed = processed.replace(new RegExp(key, "g"), FRACTION_MAP[key]);
    });
    return processed;
  };

  const clean = (str: string) =>
    preProcess(str)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

  const shortenValue = (val: any) => {
    if (!val) return "";
    const raw = preProcess(val).toUpperCase();

    const parts = raw.match(/[0-9]+|[A-Z]+/g) || [];

    const chunks = parts.map((p) => {
      if (/^[0-9]+$/.test(p)) {
        return p;
      }
      return p.length > 4 ? p.substring(0, 2) + p.slice(-2) : p;
    });

    return chunks.join("");
  };

  const parts = [
    clean(String(category)).padStart(2, "0"),
    clean(shortenTitleTo(name, 3)),
  ];

  if (unit) {
    parts.push(clean(unit.substring(0, 3)));
  }

  if (values && values.length > 0) {
    const processedValues = [...values]
      .sort((a, b) => (Number(a.id || 0)) - (Number(b.id || 0)))
      .map((val) => shortenValue(val.value || val.name || val));

    parts.push(...processedValues);
  }

  if (suffix) {
    parts.push(suffix);
  }

  return parts.join("-");
}

export function getBarcode(id: number | string): string {
  return String(id).padStart(8, "0");
}
