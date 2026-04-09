import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        buy: "#00c853",
        sell: "#ff1744",
        bg: {
          primary: "#0a0a0a",
          secondary: "#111111",
          card: "#1a1a1a",
          hover: "#222222",
        },
        border: "#2a2a2a",
        muted: "#666666",
      },
    },
  },
  plugins: [],
};

export default config;
