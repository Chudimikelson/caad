import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Horizon-style blue
    },
    secondary: {
      main: "#9c27b0", // Purple accent
    },
    background: {
      default: "#f8f9fa", // Light gray background
      paper: "#ffffff",   // White cards
    },
    success: {
      main: "#4caf50", // Green for Paid
    },
    error: {
      main: "#f44336", // Red for Missed
    },
    warning: {
      main: "#ff9800", // Orange for alerts
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
    h4: {
      fontWeight: 700,
      color: "#333",
    },
    h6: {
      fontWeight: 600,
      color: "#555",
    },
    body2: {
      color: "#777",
    },
  },
  shape: {
    borderRadius: 12, // Rounded corners for cards/buttons
  },
});

export default theme;