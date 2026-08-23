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
        quicksand: ['Quicksand-Regular', 'QuickSand-Regular', 'sans-serif'],
        'quicksand-bold': ['Quicksand-Bold', 'QuickSand-Bold', 'sans-serif'],
        'quicksand-semibold': ['Quicksand-SemiBold', 'QuickSand-SemiBold', 'sans-serif'],
        'quicksand-light': ['Quicksand-Light', 'QuickSand-Light', 'sans-serif'],
        'quicksand-medium': ['Quicksand-Medium', 'QuickSand-Medium', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
