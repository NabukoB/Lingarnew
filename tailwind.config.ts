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
          ghost: "#9CA3AF",
          accent: "#C9A050",
          gold: "#C9A050",
          dark: "#161618",
          surface: "#222226",
          surface2: "#2A2A2E",
          amber: "#F59E0B",
          red: "#EF4444",
          green: "#10B981",
          muted: "#161618",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
