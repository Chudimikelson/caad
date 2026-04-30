import React from "react";
import { Box, Typography } from "@mui/material";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

export default function LoanAgingAnalysis() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 2,
      }}
    >
      <HourglassBottomIcon sx={{ fontSize: 64, color: "#3b82f6", opacity: 0.8 }} />
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          color: "#1e3a8a",
          letterSpacing: "-0.01em",
        }}
      >
        Coming Soon
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontFamily: "'Poppins', sans-serif",
          color: "#64748b",
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        The Loan Aging Analysis report is currently under development and will be available in a future update.
      </Typography>
    </Box>
  );
}
