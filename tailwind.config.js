/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./popup.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#1a1a1a',
          raised: '#252525',
          hover: '#2a2a2a',
        },
        dim: '#a0a0a0',
        faint: '#666666',
        edge: {
          DEFAULT: '#333333',
          strong: '#404040',
        },
        accent: {
          DEFAULT: '#ff3e3e',
          hover: '#ff5555',
        },
        danger: '#f87171',
        positive: '#4ade80',
      },
      boxShadow: {
        accent: '0 4px 15px rgba(255, 62, 62, 0.3)',
        'accent-lg': '0 6px 20px rgba(255, 62, 62, 0.3)',
        popup: '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
