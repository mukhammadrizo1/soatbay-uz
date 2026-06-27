/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f6feb',
          dark: '#1a5fce',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
