// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'octo-orange': '#FF8C00', // 主色调：活力橙
        'octo-white': '#FFFFFF',  // 背景：纯洁白
        'octo-cream': '#FFF5EE',  // 辅助：奶油色（用于卡片悬停等）
      },
    },
  },
  plugins: [],
};
export default config;