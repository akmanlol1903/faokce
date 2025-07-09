/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Varsayılan 'sans' fontunu Montserrat olarak ayarla
        // Sistemde Montserrat yüklü değilse, diğer standart sans-serif fontlarına geçiş yapar
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
};