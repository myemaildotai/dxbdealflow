import { createTheme } from "@mui/material/styles";
import { brandBreakpoints, brandColors, brandFonts, brandRadii, brandShadows } from "@/theme/brand";

export const muiTheme = createTheme({
  breakpoints: {
    values: {
      xs: brandBreakpoints.xs,
      sm: brandBreakpoints.sm,
      md: brandBreakpoints.md,
      lg: brandBreakpoints.lg,
      xl: brandBreakpoints.xl,
    },
  },
  palette: {
    mode: "light",
    primary: {
      main: brandColors.primary,
      dark: brandColors.primaryHover,
      contrastText: brandColors.white,
    },
    secondary: {
      main: brandColors.gold,
      dark: brandColors.goldBright,
      contrastText: brandColors.primary,
    },
    background: {
      default: brandColors.background,
      paper: brandColors.surface,
    },
    text: {
      primary: brandColors.ink,
      secondary: brandColors.gray,
    },
    success: {
      main: brandColors.success,
    },
    warning: {
      main: brandColors.warning,
    },
    error: {
      main: brandColors.danger,
    },
    divider: brandColors.border,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: brandFonts.body,
    h1: {
      fontFamily: brandFonts.heading,
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h2: {
      fontFamily: brandFonts.heading,
      fontWeight: 600,
      letterSpacing: "-0.025em",
    },
    h3: {
      fontFamily: brandFonts.heading,
      fontWeight: 500,
      letterSpacing: "-0.02em",
    },
    button: {
      fontFamily: brandFonts.body,
      fontWeight: 500,
      textTransform: "none",
    },
    subtitle2: {
      letterSpacing: "0.08em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brandColors.background,
          color: brandColors.ink,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: brandRadii.md,
          boxShadow: brandShadows.soft,
          backgroundImage: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: brandRadii.sm,
          backgroundColor: brandColors.white,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: brandColors.border,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: brandColors.primaryHover,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: brandColors.gold,
          },
        },
      },
    },
  },
});
