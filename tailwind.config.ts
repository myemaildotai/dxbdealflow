import type { Config } from "tailwindcss";
import { brandColors, brandShadows } from "./src/theme/brand";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: brandColors.primary,
          blue: brandColors.primaryHover,
          gold: brandColors.gold,
          orange: brandColors.gold,
          goldBright: brandColors.goldBright,
          ink: brandColors.ink,
          slate: brandColors.gray,
          bg: brandColors.background,
          panel: brandColors.surface,
          "panel-soft": brandColors.surfaceSoft,
          "panel-muted": brandColors.surfaceMuted,
          line: brandColors.border,
          "line-strong": brandColors.borderStrong,
          success: brandColors.success,
          warning: brandColors.warning,
          danger: brandColors.danger,
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-montserrat)", "sans-serif"],
      },
      boxShadow: {
        soft: brandShadows.soft,
        medium: brandShadows.medium,
        strong: brandShadows.strong,
      },
    },
  },
  plugins: [],
};

export default config;
