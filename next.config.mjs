import { withSentryConfig } from "@sentry/nextjs/config";
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["pg"],
  async redirects() {
    return [
      {
        source: "/good-receipt",
        destination: "/good-receipts",
        permanent: true,
      },
      {
        source: "/good-receipt/new",
        destination: "/good-receipts/create",
        permanent: true,
      },
      {
        source: "/good-receipt/:id",
        destination: "/good-receipts/:id",
        permanent: true,
      },
      {
        source: "/sales",
        destination: "/sales-orders",
        permanent: true,
      },
      {
        source: "/sales/:id",
        destination: "/sales-orders/:id",
        permanent: true,
      },
      {
        source: "/reorders",
        destination: "/reports/reorder-levels",
        permanent: true,
      },
      {
        source: "/price-history",
        destination: "/reports/price-history",
        permanent: true,
      },
      {
        source: "/reports/no-sale",
        destination: "/reports/no-sales",
        permanent: true,
      },
      {
        source: "/stock-adjustments",
        destination: "/reports/stock-adjustments",
        permanent: true,
      },
      {
        source: "/break-packs",
        destination: "/inventory/break-packs",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading/bundler-plugin-options/

  org: "joel-carlos",

  project: "inventory-next",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
