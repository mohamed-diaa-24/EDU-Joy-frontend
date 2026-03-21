/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'kids-blue': '#00aeef',
        'kids-yellow': '#ffce00',
        'kids-green': '#a1d053',
      }
    },
  },
  plugins: [],
}
