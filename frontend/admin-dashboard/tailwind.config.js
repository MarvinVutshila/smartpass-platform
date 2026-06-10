/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: { 50:"#EFF6FF",100:"#DBEAFE",200:"#BFDBFE",300:"#93C5FD",400:"#60A5FA",500:"#3B82F6",600:"#2563EB",700:"#1D4ED8",800:"#1E40AF",900:"#1E3A8A" },
        violet: { 500:"#8B5CF6",600:"#7C3AED",700:"#6D28D9" },
        emerald:{ 50:"#ECFDF5",100:"#D1FAE5",500:"#10B981",600:"#059669" },
        amber:  { 50:"#FFFBEB",100:"#FEF3C7",500:"#F59E0B",600:"#D97706" },
        rose:   { 50:"#FFF1F2",100:"#FFE4E6",500:"#EF4444",600:"#DC2626" },
        slate:  { 50:"#F8FAFC",100:"#F1F5F9",200:"#E2E8F0",300:"#CBD5E1",400:"#94A3B8",500:"#64748B",600:"#475569",700:"#334155",800:"#1E293B",900:"#0F172A" },
      },
      animation: { "fade-in":"fadeIn .3s ease both","slide-up":"slideUp .35s ease both",shimmer:"shimmer 1.6s infinite" },
      keyframes: {
        fadeIn:  { from:{opacity:0}, to:{opacity:1} },
        slideUp: { from:{opacity:0,transform:"translateY(12px)"}, to:{opacity:1,transform:"translateY(0)"} },
        shimmer: { "100%":{backgroundPosition:"-200% 0"} },
      },
    },
  },
  plugins: [],
};
