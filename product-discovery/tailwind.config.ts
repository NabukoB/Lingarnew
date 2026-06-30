import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          50: "#fbf4ef",
          100: "#f4e3d7",
          200: "#e7c4a8",
          300: "#d9a378",
          400: "#c97f50",
          500: "#b8623a",
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
          400: "#7c7872",
          500: "#5a564f",
          600: "#403d38",
          700: "#2c2a26",
          800: "#1c1b18",
          900: "#121110",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
