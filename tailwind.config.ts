import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Orijinal tasarım sistemiyle birebir (style.css)
        radar: {
          bg: "#07070d",
          panel: "#14141f",
          line: "rgba(255,255,255,0.08)",
          glow: "#FF0033", // YouTube kırmızısı (accent)
        },
        gs: { gold: "#FFD700", red: "#FF1744" },
        fb: { yellow: "#FFEB3B", navy: "#1A237E" },
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        sweep: "sweep 4s linear infinite",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
