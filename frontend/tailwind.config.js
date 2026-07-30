/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Intake palette (warm, vibrant-but-not-bold) — used by /contribute
        // only. Do not use in encyclopedia components.
        cream: "#fbf7f0",
        clay: "#c96f4a",
        amber: "#e0a458",
        coral: "#e07a5f",
        // "Light Film Room" tokens (encyclopedia visual system, ux.md) —
        // formalized from the mockups' inline tailwind.config. Values mirror
        // built-in Tailwind shades (kept in sync intentionally):
        // panel=zinc-100, border=zinc-300, accentPink=pink-700,
        // accentGreen=emerald-700, accentPinkDark=pink-800 (hover).
        film: {
          base: "#ffffff",
          panel: "#f4f4f5",
          border: "#d4d4d8",
          accentPink: "#be185d",
          accentPinkDark: "#9d174d",
          accentGreen: "#047857",
        },
      },
      fontFamily: {
        // Archivo Black is the display face, self-hosted via @font-face in
        // index.css (OFL — see the note there on the two faces this replaced).
        // Single weight; the fallbacks only matter before the font loads.
        heading: ['"Archivo Black"', '"Oswald"', '"Arial Narrow"', "sans-serif"],
        // Mockup config: mono is the "film room / spec sheet" UI voice
        // (nav, pills, buttons, badges); sans is body prose. Self-hosted
        // JetBrains Mono via @font-face in index.css.
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Helvetica Neue"', "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
