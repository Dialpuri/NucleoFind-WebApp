/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nfPrimary': 'rgba(245,241,241,1)',
        'nfSecondary': 'rgba(50,106,144,1)',
        'nfSecondaryAlt': 'rgb(71,160,209)',
        'nfTertiary': 'rgba(214,225,233,1)',
        'nfAccent': '#f1b256',
        'nfAccentFaded': '#ddd4a0',
      },
      animation: {
        rotate: "rotate 10s linear infinite",
      },
      keyframes: {
        rotate: {
          "0%": { transform: "rotate(360deg) scale(10)" },
          "100%": { transform: "rotate(0deg) scale(10)" },
        },
      },
    },
  },
  plugins: [],
}