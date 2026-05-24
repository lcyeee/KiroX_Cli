/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0a",
          card: "#111111",
          elevated: "#1a1a1a",
          hover: "#222222",
        },
        accent: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          dark: "#d97706",
          glow: "rgba(245, 158, 11, 0.15)",
        },
        border: {
          DEFAULT: "#2a2a2a",
          light: "#333333",
        },
        text: {
          primary: "#ffffff",
          secondary: "#a3a3a3",
          muted: "#6b6b6b",
        },
        status: {
          running: "#22c55e",
          completed: "#3b82f6",
          stopped: "#ef4444",
          idle: "#6b6b6b",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Noto Sans", "Helvetica Neue", "sans-serif"],
        mono: ["SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", "Consolas", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.2)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(245, 158, 11, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.6)" },
        },
      },
    },
  },
  plugins: [],
}
