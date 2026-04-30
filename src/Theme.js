import { createTheme } from "@mui/material/styles";

const createAppTheme = (mode = "light") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#1e3a8a",
      },
      secondary: {
        main: "#0f766e",
      },
      background: {
        default: mode === "dark" ? "#0b1220" : "#f3f7fb",
        paper: mode === "dark" ? "#111827" : "#ffffff",
      },
      success: {
        main: "#16a34a",
      },
      error: {
        main: "#dc2626",
      },
      warning: {
        main: "#d97706",
      },
      text: {
        primary: mode === "dark" ? "#e5e7eb" : "#0f172a",
        secondary: mode === "dark" ? "#cbd5e1" : "#475569",
      },
    },
    typography: {
      fontFamily: "Manrope, Nunito Sans, Segoe UI, sans-serif",
      h4: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
    },
  });

export default createAppTheme;