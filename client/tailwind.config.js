/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Assistant', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        sigma: {
          navy:     '#06154E',
          midnight: '#0F257A',
          blue:     '#1441F5',
          accent:   '#3F64F7',
          ice:      '#EDF0FE',
          red:      '#F36059',
          orange:   '#FF8E21',
          yellow:   '#F9BD33',
          green:    '#54E075',
          teal:     '#27DBE4',
          purple:   '#FB79F3',
          neutral:  '#44546A',
          gray:     '#E7E6E6',
        },
      },
    },
  },
  plugins: [],
};
