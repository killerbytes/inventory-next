import moment from "moment-timezone";
import { Op } from "sequelize";

export type DateFilter = {
  [Op.gte]?: Date;
  [Op.lte]?: Date;
};

/**
 * Generates a Sequelize date filter condition with start-of-day and end-of-day UTC boundaries
 * aligned to the configured business timezone (default: Asia/Manila).
 *
 * Why: Timestamps are stored in UTC across the database, but user filter requests specify
 * local calendar days. Converting to UTC start-of-day and end-of-day in the business timezone
 * avoids off-by-one day bugs across varying server/client execution environments.
 *
 * @param startDate - Earliest boundary date string or Date instance
 * @param endDate - Latest boundary date string or Date instance
 * @param timezone - IANA timezone identifier (defaults to process.env.TIMEZONE || "Asia/Manila")
 * @returns Sequelize query condition object with Op.gte and/or Op.lte, or undefined if neither boundary is provided
 */
export function buildDateFilter(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
): DateFilter | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: DateFilter = {};

  if (startDate) {
    filter[Op.gte] = moment
      .tz(startDate, timezone)
      .startOf("day")
      .utc()
      .toDate();
  }

  if (endDate) {
    filter[Op.lte] = moment
      .tz(endDate, timezone)
      .endOf("day")
      .utc()
      .toDate();
  }

  return filter;
}
