import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        lingar: {
          ink: "#0F0F0F",
          paper: "#FAFAF8",
          ghost: "#6B7280",
          accent: "#2563EB",
          amber: "#F59E0B",
          red: "#EF4444",
          green: "#10B981",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
