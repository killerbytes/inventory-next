import moment from "moment-timezone";

/**
 * Generates timezone-aligned start-of-day and end-of-day UTC boundary Date objects
 * for Drizzle ORM queries (default: Asia/Manila).
 *
 * Why: Timestamps are stored in UTC across the database, but user filter requests specify
 * local calendar days. Converting to UTC start-of-day and end-of-day in the business timezone
 * avoids off-by-one day bugs across varying server/client execution environments.
 *
 * @param startDate - Earliest boundary date string or Date instance
 * @param endDate - Latest boundary date string or Date instance
 * @param timezone - IANA timezone identifier (defaults to process.env.TIMEZONE || "Asia/Manila")
 * @returns Object with startBound and endBound Date objects
 */
export function getDateBounds(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
): { startBound?: Date; endBound?: Date } {
  let startBound: Date | undefined;
  let endBound: Date | undefined;

  if (startDate) {
    startBound = moment.tz(startDate, timezone).startOf("day").utc().toDate();
  }
  if (endDate) {
    endBound = moment.tz(endDate, timezone).endOf("day").utc().toDate();
  }

  return { startBound, endBound };
}

