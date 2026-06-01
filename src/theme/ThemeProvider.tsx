"use client";

import { ReactNode } from "react";
import { CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { muiTheme } from "@/theme/mui-theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={4}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        autoHideDuration={4000}
      >
        {children}
      </SnackbarProvider>
    </MuiThemeProvider>
  );
}
