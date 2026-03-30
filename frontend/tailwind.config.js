/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0B0E22',
          900: '#121731',
          800: '#1B2139',
          700: '#272E4A',
          600: '#3D4671',
        },
        gold: {
          300: '#B9C2FF',
          400: '#8A95FF',
          500: '#5E6EFF',
          600: '#444FDD',
        },
        slate: {
          850: '#161C31',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-dot': 'bounceDot 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1.0)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
