/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        violet: {
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
        emerald: {
          500: "#10B981",
          600: "#059669",
        },
        amber:  { 500: "#F59E0B" },
        rose:   { 500: "#EF4444", 600: "#DC2626" },
        slate:  {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      animation: {
        "fade-in":    "fadeIn .35s ease both",
        "slide-up":   "slideUp .4s ease both",
        "pulse-slow": "pulse 3s cubic-bezier(.4,0,.6,1) infinite",
        shimmer:      "shimmer 1.6s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "100%": { backgroundPosition: "-200% 0" } },
      },
      boxShadow: {
        card:   "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)",
        "card-hover": "0 4px 24px rgba(0,0,0,.10)",
        glass:  "0 8px 32px rgba(31,38,135,.12)",
      },
    },
  },
  plugins: [],
};
