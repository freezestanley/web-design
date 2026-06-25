/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#f4f7fb",
        accent: "#0f766e"
      },
      fontFamily: {
        sans: ["Syne", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 24px 80px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};
