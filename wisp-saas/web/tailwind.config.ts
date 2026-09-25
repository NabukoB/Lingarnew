import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#f4f5f7",
        line: "#f1f3f6",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "26px",
        tile: "22px",
      },
      boxShadow: {
        card: "0 6px 18px rgba(15,23,42,0.05)",
        soft: "0 4px 12px rgba(15,23,42,0.06)",
        float: "0 10px 30px rgba(15,23,42,0.12)",
        brand: "0 10px 24px rgba(37,99,235,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
