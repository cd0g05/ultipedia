/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Warm, vibrant-but-not-bold base. Per-section accent colors + full
      // animation direction land in the polish-analytics partition.
      colors: {
        cream: "#fbf7f0",
        clay: "#c96f4a",
        amber: "#e0a458",
        coral: "#e07a5f",
      },
    },
  },
  plugins: [],
};
