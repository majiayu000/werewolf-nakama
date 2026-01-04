/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 使用 class 策略控制暗黑模式（通过 html 元素的 dark/light 类）
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        'touch': { raw: '(hover: none) and (pointer: coarse)' },
      },
      colors: {
        // 狼人杀主题色
        werewolf: {
          night: '#0f0f23',
          day: '#f8f4e8',
          blood: '#8b0000',
          wolf: '#4a4a4a',
          villager: '#2e7d32',
          seer: '#7b1fa2',
          witch: '#6a1b9a',
          guard: '#1565c0',
          hunter: '#f57c00',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
