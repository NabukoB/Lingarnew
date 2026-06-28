import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        fundiops: {
          bg: "#0f1117",
          card: "#1a1d27",
          border: "#2a2d3a",
          accent: "#25d366",
          "accent-muted": "#128c7e",
          muted: "#6b7280",
          text: "#f3f4f6",
          "text-muted": "#9ca3af",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
