/**
 * Standard storage keys designated for form drafts across the application.
 */
export const DRAFT_STORAGE_KEYS = {
  PURCHASE: "INVENTORY_PURCHASE_DRAFT",
  SALES_ORDER: "INVENTORY_SALES_ORDER_DRAFT",
} as const;

export type DraftStorageKey =
  | (typeof DRAFT_STORAGE_KEYS)[keyof typeof DRAFT_STORAGE_KEYS]
  | (string & {});

/**
 * Serializes form data into a JSON string safe for web storage.
 *
 * @remarks
 * In default JSON.stringify, undefined properties are omitted completely. Converting
 * undefined values to null ensures that reset/patch operations in react-hook-form
 * accurately receive explicit empty field keys instead of skipping them.
 */
export function serializeDraft<T>(values: Partial<T>): string {
  return JSON.stringify(values, (_, value) => (value === undefined ? null : value));
}

/**
 * Deserializes raw JSON string and converts specified date fields back into Date objects.
 *
 * @remarks
 * Dates in JSON serialize to ISO strings. Many Zod schemas and date inputs require
 * native JavaScript Date instances. Specifying dateFields enables automatic reconstitution
 * without repetitive mapping in every component.
 */
export function deserializeDraft<T>(
  json: string,
  dateFields?: (keyof T)[],
): T | null {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    if (dateFields && dateFields.length > 0) {
      for (const field of dateFields) {
        if (data[field]) {
          data[field] = new Date(data[field]);
        }
      }
    }

    return data as T;
  } catch {
    return null;
  }
}

/**
 * Persists the provided form values to localStorage under the given storage key.
 *
 * @remarks
 * Verifies that the window and localStorage objects are available to prevent SSR failures.
 * Silently catches quota or permission errors to avoid breaking UI operations.
 */
export function saveDraft<T>(storageKey: string, values: Partial<T>): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = serializeDraft(values);
    localStorage.setItem(storageKey, serialized);
  } catch {
    // Gracefully handle storage quota or privacy restrictions
  }
}

/**
 * Retrieves and deserializes a form draft from localStorage.
 *
 * @remarks
 * Returns null if no draft exists, if running on the server, or if the stored JSON is malformed.
 */
export function loadDraft<T>(
  storageKey: string,
  dateFields?: (keyof T)[],
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return deserializeDraft<T>(stored, dateFields);
  } catch {
    return null;
  }
}

/**
 * Purges the draft stored under the given storage key from localStorage.
 *
 * @remarks
 * Called when a form successfully submits to prevent stale drafts from reappearing upon subsequent modal/page opens.
 */
export function clearDraft(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Gracefully handle storage errors
  }
}
