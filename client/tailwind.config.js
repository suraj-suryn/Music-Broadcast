/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'float-up': {
          '0%':   { transform: 'translateY(0) scale(1)',    opacity: '1' },
          '80%':  { opacity: '1' },
          '100%': { transform: 'translateY(-180px) scale(1.4)', opacity: '0' }
        }
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'float-up': 'float-up 2.2s ease-out forwards'
      }
    }
  },
  plugins: []
}
