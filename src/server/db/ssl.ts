export interface DbSslResolutionParams {
  host?: string;
  nodeEnv?: string;
  dbSsl?: string;
}

/**
 * Resolves PostgreSQL SSL configuration for connection pools and Drizzle Kit.
 * Cloud-hosted PostgreSQL (such as Railway proxies) and production environments require SSL,
 * whereas local development and integration test runners do not.
 */
export function resolveDbSsl(
  params?: DbSslResolutionParams,
): false | { rejectUnauthorized: boolean } {
  const host = params?.host ?? process.env.DB_HOST ?? "localhost";
  const nodeEnv = params?.nodeEnv ?? process.env.NODE_ENV;
  const dbSsl = params?.dbSsl ?? process.env.DB_SSL;

  if (
    dbSsl === "true" ||
    nodeEnv === "production" ||
    (typeof host === "string" && host.includes("rlwy.net"))
  ) {
    return { rejectUnauthorized: false };
  }

  return false;
}
