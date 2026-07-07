import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        bot: {
          ink: "#0A0A0B",
          paper: "#FAFAF8",
          muted: "#9CA3AF",
          accent: "#22D3EE",
          surface: "#141416",
          surface2: "#1E1E22",
          border: "#2A2A2E",
          green: "#10B981",
          red: "#EF4444",
          amber: "#F59E0B",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
