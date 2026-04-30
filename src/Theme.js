import { createTheme } from "@mui/material/styles";

const DEEP_BLUE = "#0b1437";
const PAPER_BLUE = "#111c44";
const ACCENT_BLUE = "#3b82f6";
const TEXT_PRIMARY = "#f8fbff";
const TEXT_SECONDARY = "#a3aed0";

const createAppTheme = (mode = "light") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "dark" ? ACCENT_BLUE : "#1e3a8a",
      },
      secondary: {
        main: mode === "dark" ? "#60a5fa" : "#0f766e",
      },
      background: {
        default: mode === "dark" ? DEEP_BLUE : "#f3f7fb",
        paper: mode === "dark" ? PAPER_BLUE : "#ffffff",
      },
      success: {
        main: "#16a34a",
      },
      error: {
        main: mode === "dark" ? "#f87171" : "#dc2626",
      },
      warning: {
        main: mode === "dark" ? "#fbbf24" : "#d97706",
      },
      text: {
        primary: mode === "dark" ? TEXT_PRIMARY : "#0f172a",
        secondary: mode === "dark" ? TEXT_SECONDARY : "#475569",
      },
    },
    typography: {
      fontFamily: "Manrope, Nunito Sans, Segoe UI, sans-serif",
      h1: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
      h2: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
      h3: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
      h4: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
      h5: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
      h6: { fontWeight: 700, color: mode === "dark" ? TEXT_PRIMARY : undefined },
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
            border: mode === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
            boxShadow: mode === "dark"
              ? "0 18px 36px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.03)"
              : undefined,
            borderRadius: mode === "dark" ? 20 : undefined,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? TEXT_PRIMARY : undefined,
            borderBottom: mode === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : undefined,
          },
          head: {
            color: mode === "dark" ? TEXT_SECONDARY : undefined,
            fontWeight: 700,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: mode === "dark" ? "rgba(59, 130, 246, 0.15)" : undefined,
            border: mode === "dark" ? "1px solid rgba(96, 165, 250, 0.24)" : undefined,
          },
          label: { color: mode === "dark" ? TEXT_PRIMARY : undefined },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: mode === "dark" ? "rgba(17, 28, 68, 0.7)" : undefined,
            color: mode === "dark" ? TEXT_PRIMARY : undefined,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? "rgba(255,255,255,0.14)" : undefined,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? "rgba(96,165,250,0.45)" : undefined,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: mode === "dark" ? ACCENT_BLUE : undefined,
            },
          },
          input: {
            color: mode === "dark" ? TEXT_PRIMARY : undefined,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: mode === "dark" ? TEXT_SECONDARY : undefined,
          },
        },
      },
    },
  });

export default createAppTheme;