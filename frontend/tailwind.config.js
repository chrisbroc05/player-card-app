/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        appBg: "#0A0A0A",
        cardBg: "#161616",
        cardBg2: "#1C1C1C",
        neonBlue: "#E8C56A",
        neonPurple: "#A8832A",
        neonTeal: "#C9A84C",
        gold: {
          primary: "#C9A84C",
          bright: "#E8C56A",
          deep: "#A8832A",
          muted: "#8B6914",
        },
      },
      boxShadow: {
        glowBlue: "0 0 0 1px rgba(201,168,76,0.35), 0 10px 30px rgba(201,168,76,0.18)",
        glowGold: "0 0 20px rgba(201,168,76,0.3)",
        glowPurple: "0 0 0 1px rgba(168,131,42,0.35), 0 10px 30px rgba(201,168,76,0.15)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(201, 168, 76, 0.25)", opacity: "1" },
          "50%": { boxShadow: "0 0 36px rgba(201, 168, 76, 0.45)", opacity: "0.98" },
        },
      },
      animation: {
        fadeUp: "fadeUp 300ms ease-out",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
