/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      animation: {
        "slide-up": "slideUp 0.28s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "float": "float 3.5s ease-in-out infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.90)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        borderGlow: {
          "0%, 100%": { boxShadow: "0 0 0 1px rgba(124,92,255,0.25), 0 0 18px rgba(124,92,255,0.08)" },
          "50%": { boxShadow: "0 0 0 1px rgba(124,92,255,0.6), 0 0 32px rgba(124,92,255,0.22)" },
        },
      },
      boxShadow: {
        "accent": "0 0 0 1px rgba(124,92,255,0.45), 0 8px 30px rgba(124,92,255,0.18)",
        "accent-lg": "0 0 0 1px rgba(124,92,255,0.5), 0 20px 60px rgba(124,92,255,0.3)",
        "glow-sm": "0 0 16px rgba(124,92,255,0.35)",
        "glow-cyan": "0 0 20px rgba(34,211,238,0.3)",
        "card": "0 1px 0 rgba(255,255,255,0.02) inset, 0 16px 40px rgba(0,0,0,0.45)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px rgba(0,0,0,0.55)",
      },
    },
  },
  plugins: [],
}