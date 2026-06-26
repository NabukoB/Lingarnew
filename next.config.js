/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.lingar.app" },
    ],
  },
};

module.exports = nextConfig;
