/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        appBg: "#070B14",
        cardBg: "#0F172A",
        cardBg2: "#111C34",
        neonBlue: "#35A7FF",
        neonPurple: "#8B5CF6",
        neonTeal: "#2DD4BF",
      },
      boxShadow: {
        glowBlue: "0 0 0 1px rgba(53,167,255,0.35), 0 10px 30px rgba(53,167,255,0.18)",
        glowPurple: "0 0 0 1px rgba(139,92,246,0.35), 0 10px 30px rgba(139,92,246,0.18)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 300ms ease-out",
      },
    },
  },
  plugins: [],
};
