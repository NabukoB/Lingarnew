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
    outputFileTracingIncludes: {
      "/trading-bot": ["./trading-bot/memory/**/*"],
    },
  },
};

module.exports = nextConfig;
