import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // dark editor palette
        panel: "#16161c",
        panel2: "#1d1d25",
        edge: "#2a2a33",
        accent: "#7c5cff",
        accent2: "#a78bfa",
      },
    },
  },
  plugins: [],
};

export default config;
