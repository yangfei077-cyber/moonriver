/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F2B949",
        'mango-light': '#EDD377',
        'mango-yellow': '#F2E829',
        'mango-orange': '#F27430',
        "background-light": "#FFFCF5",
        "background-dark": "#2C2C2C",
        'text-light': '#1F2937',
        'text-dark': '#F9FAFB',
        'card-light': '#FFFFFF',
        'card-dark': '#374151',
        'dash-primary': '#F97316',
        'dash-secondary': '#FBBF24',
        'dash-accent': '#FB923C',
        'success': '#10B981',
        'warning': '#F59E0B',
      },
      fontFamily: {
        display: ['Fredoka One', 'cursive'],
        body: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
