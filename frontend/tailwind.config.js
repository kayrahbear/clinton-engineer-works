/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        accent: "#38bdf8",
        ff: {
          bg: "#5a5475",
          surface: "#3a364b",
          surface2: "#645e82",
          border: "#464258",
          text: "#f8f8f2",
          muted: "#c0bdd1",
          subtle: "#958db8",
          pink: "#ffb8d1",
          coral: "#ff857f",
          mint: "#c2ffdf",
          mint2: "#c9e7d5",
          yellow: "#f9f158",
          gold: "#e6c000",
          lilac: "#b8a2ce",
          lilac2: "#C5A3FF",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)",
        glowMint: "0 0 0 2px rgba(194,255,223,0.35), 0 10px 25px rgba(0,0,0,0.25)",
        glowPink: "0 0 0 2px rgba(255,184,209,0.35), 0 10px 25px rgba(0,0,0,0.25)",
      },
      backgroundImage: {
        "ff-gradient":
          "radial-gradient(1200px 600px at 10% 0%, rgba(255,184,209,0.18), transparent 60%), " +
          "radial-gradient(900px 500px at 90% 10%, rgba(194,255,223,0.16), transparent 55%), " +
          "radial-gradient(800px 500px at 50% 100%, rgba(249,241,88,0.12), transparent 60%)",
      },
      keyframes: {
        twinkle: { "0%,100%": { opacity: 0.6 }, "50%": { opacity: 1 } },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

