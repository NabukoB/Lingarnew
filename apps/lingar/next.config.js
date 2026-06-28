/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.lingar.app" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
};

module.exports = nextConfig;
