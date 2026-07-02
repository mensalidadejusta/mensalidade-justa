import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6366f1", hover: "#4f46e5", light: "#e0e7ff" },
        accent: { DEFAULT: "#06b6d4", hover: "#0891b2" },
        success: "#10b981",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
} satisfies Config;
