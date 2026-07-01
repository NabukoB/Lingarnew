import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#F9F8FF",
          alt: "#F3F2FF",
        },
        hairline: {
          DEFAULT: "#E8E7F0",
          strong: "#D4D2E8",
        },
        primary: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
        },
        ink: {
          900: "#1E1B4B",
          800: "#1F2937",
          700: "#374151",
          500: "#6B7280",
          400: "#9CA3AF",
          300: "#D1D5DB",
          200: "#E5E7EB",
          100: "#F3F4F6",
          50: "#F9FAFB",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px -2px rgba(30,27,75,.07), 0 1px 3px rgba(30,27,75,.04)",
        "card-up": "0 8px 30px -4px rgba(30,27,75,.14), 0 2px 8px rgba(30,27,75,.08)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
