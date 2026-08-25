/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#53B175',
        bg: {
          light: '#ffffff',
        },
        white: {
          DEFAULT: '#ffffff',
          100: '#fafafa',
          200: '#FE8C00',
        },
        gray: {
          100: '#878787',
          200: '#878787',
        },
        dark: {
          100: '#181C2E',
        },
        error: '#F14141',
        success: '#53B175',
      },
      fontFamily: {
        // Quicksand — Primary font (matches source app)
        sans: ['Quicksand-Regular', 'sans-serif'],
        quicksand: ['Quicksand-Regular', 'sans-serif'],
        'quicksand-bold': ['Quicksand-Bold', 'sans-serif'],
        'quicksand-semibold': ['Quicksand-SemiBold', 'sans-serif'],
        'quicksand-medium': ['Quicksand-Medium', 'sans-serif'],
        'quicksand-light': ['Quicksand-Light', 'sans-serif'],

        // Inter aliases → Quicksand (legacy class names still work)
        inter: ['Quicksand-Regular', 'sans-serif'],
        'inter-bold': ['Quicksand-Bold', 'sans-serif'],
        'inter-semibold': ['Quicksand-SemiBold', 'sans-serif'],
        'inter-medium': ['Quicksand-Medium', 'sans-serif'],
        'inter-light': ['Quicksand-Light', 'sans-serif'],

        // Gilroy aliases → Quicksand
        gilroy: ['Quicksand-Regular', 'sans-serif'],
        'gilroy-bold': ['Quicksand-Bold', 'sans-serif'],
        'gilroy-semibold': ['Quicksand-SemiBold', 'sans-serif'],
        'gilroy-medium': ['Quicksand-Medium', 'sans-serif'],
        'gilroy-light': ['Quicksand-Light', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
