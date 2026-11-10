import moment from "moment-timezone";

export interface BusinessCalendar {
  today: string;
  yesterday: string;
  monthStart: string;
  monthEnd: string;
  lastMonthStart: string;
  lastMonthEnd: string;
}

/**
 * Resolves "today", "yesterday", and month ranges as `YYYY-MM-DD` calendar days in the
 * business timezone, ready to pass as `startDate`/`endDate` to services (which run them
 * through `getDateBounds`).
 *
 * Why: formatting with the server's local clock picks the wrong day whenever the server's
 * timezone differs from the store's (e.g. a UTC host before 08:00 Manila time).
 */
export function getBusinessCalendar(
  now: Date = new Date(),
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
): BusinessCalendar {
  const local = moment.tz(now, timezone);
  const day = (m: moment.Moment) => m.format("YYYY-MM-DD");
  const lastMonth = local.clone().subtract(1, "month");

  return {
    today: day(local),
    yesterday: day(local.clone().subtract(1, "day")),
    monthStart: day(local.clone().startOf("month")),
    monthEnd: day(local.clone().endOf("month")),
    lastMonthStart: day(lastMonth.clone().startOf("month")),
    lastMonthEnd: day(lastMonth.clone().endOf("month")),
  };
}

/**
 * Returns the business-timezone calendar day (`YYYY-MM-DD`) a timestamp falls on.
 *
 * Why: `toISOString().split("T")[0]` gives the UTC day, which puts sales made between
 * 00:00 and 08:00 Manila time on the previous day.
 */
export function toBusinessDay(
  date: Date | string,
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
): string {
  return moment.tz(date, timezone).format("YYYY-MM-DD");
}

/**
 * Lists the last `count` business-timezone calendar days ending today, oldest first,
 * each with a short display label (e.g. "Nov 11").
 */
export function getRecentBusinessDays(
  count: number,
  now: Date = new Date(),
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
): { date: string; label: string }[] {
  const today = moment.tz(now, timezone).startOf("day");
  return Array.from({ length: count }, (_, i) => {
    const day = today.clone().subtract(count - 1 - i, "days");
    return { date: day.format("YYYY-MM-DD"), label: day.format("MMM D") };
  });
}

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

