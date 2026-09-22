import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  trailingSlash: true,
  // output: "export",
  // experimental: {
  //   dynamicIO: true,
  // },
};

export default nextConfig;
