/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0b0d10',
        graphite: '#11141a',
      },
      backgroundImage: {
        'zen-gradient':
          'radial-gradient(circle at 20% 20%, rgba(90,140,255,0.08) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,120,200,0.06) 0, transparent 45%), linear-gradient(145deg, #050608 0%, #0b0d10 45%, #0d1117 100%)',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}

