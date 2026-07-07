/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./memory/**/*"],
    },
  },
};

module.exports = nextConfig;
