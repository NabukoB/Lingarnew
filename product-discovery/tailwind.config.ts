import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F2EDE4",
        surface: {
          DEFAULT: "#FBF8F2",
          alt: "#F6F1E8",
        },
        hairline: {
          DEFAULT: "#E4DDD0",
          strong: "#D8CFBF",
        },
        pine: {
          DEFAULT: "#2C4233",
          hover: "#3C5A47",
          tint: "#E5E9E2",
        },
        star: "#C68A2E",
        swatch: {
          oat: "#E9E1D2",
          sage: "#DCE2D7",
          claymist: "#E8DACF",
          stone: "#DBE0E1",
          straw: "#EAE1C8",
        },
        clay: {
          DEFAULT: "#B5654A",
          50: "#fbf4ef",
          100: "#f4e3d7",
          200: "#e7c4a8",
          300: "#d9a378",
          400: "#c97f50",
          500: "#b5654a",
          600: "#9a4d2c",
          700: "#7c3c24",
          800: "#5e2d1c",
          900: "#402014",
        },
        ink: {
          50: "#f7f7f6",
          100: "#e9e8e6",
          200: "#d2d0cc",
          300: "#a9a6a0",
          400: "#8E887C",
          500: "#5E5A50",
          600: "#403d38",
          700: "#2c2a26",
          800: "#1c1b18",
          900: "#20201C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -18px rgba(40,34,24,.18)",
        "card-up": "0 26px 50px -22px rgba(40,34,24,.30)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
