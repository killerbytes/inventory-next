/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["sequelize", "pg", "pg-hstore"],
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

export default nextConfig;
