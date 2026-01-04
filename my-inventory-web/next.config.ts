import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337', // อนุญาตพอร์ตของ Strapi
        pathname: '/uploads/**', // อนุญาตโฟลเดอร์รูป
      },
    ],
  },
};

export default nextConfig;