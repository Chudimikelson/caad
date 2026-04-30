import React from "react";
import { Box, Paper, Typography } from "@mui/material";

const StaffProfile = () => {
  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Paper
        sx={{
          p: 3,
          borderRadius: 0.5,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>
          Staff Profile
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b" }}>
          Staff profile page is coming soon.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StaffProfile;
