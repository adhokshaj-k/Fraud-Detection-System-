/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090B10",
        panel: "#111827",
        muted: "#6B7280",
        accent: "#22d3ee"
      }
    }
  },
  plugins: []
};
