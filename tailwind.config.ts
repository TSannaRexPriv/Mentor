import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f7f4ed",
        ink: "#1a1814",
        "ink-soft": "#3d3a32",
        "ink-faint": "#7a766c",
        rule: "#d9d3c4",
        accent: "#7a3e2e",
        "accent-soft": "#a85d48",
      },
      fontFamily: {
        serif: ['"EB Garamond"', "Georgia", "serif"],
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
