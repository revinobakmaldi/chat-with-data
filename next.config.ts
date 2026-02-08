import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@duckdb/duckdb-wasm", "apache-arrow"],
  turbopack: {},
};

export default nextConfig;
