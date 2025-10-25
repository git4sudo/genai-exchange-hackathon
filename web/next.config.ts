import { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // <- This replaces `next export`
  experimental: {
    // remove `appDir` if it's causing warnings in Next.js 16
    // appDir: true,  
  },
};

export default nextConfig;
