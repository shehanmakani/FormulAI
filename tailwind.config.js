export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0f172a",
        amber: "#d97706",
        mist: "#f8fafc",
      },
      boxShadow: {
        panel: "0 18px 45px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
