import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    APP_BASE_URL: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL,
  },
};

export default nextConfig;
