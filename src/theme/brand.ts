export const brandColors = {
  primary: "#0F2A5F",
  primaryHover: "#2E4F8C",
  gold: "#D4AF37",
  goldBright: "#F3C11F",
  gray: "#8A8F98",
  background: "#F5F6F8",
  ink: "#1A1A1A",
  white: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceSoft: "#F8FAFC",
  surfaceMuted: "#EEF2F4",
  border: "#D7DEE8",
  borderStrong: "#C3CCD8",
  success: "#2ECC71",
  warning: "#F39C12",
  danger: "#D75C4D",
} as const;

export const brandFonts = {
  heading: "var(--font-montserrat)",
  body: "var(--font-inter)",
} as const;

export const brandRadii = {
  xs: "12px",
  sm: "16px",
  md: "20px",
  lg: "28px",
  pill: "999px",
} as const;

export const brandShadows = {
  soft: "0 16px 40px rgba(15, 42, 95, 0.10)",
  medium: "0 24px 60px rgba(15, 42, 95, 0.14)",
  strong: "0 30px 80px rgba(15, 42, 95, 0.18)",
  focus: "0 0 0 4px rgba(212, 175, 55, 0.18)",
} as const;

export const brandBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;
