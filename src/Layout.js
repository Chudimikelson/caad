import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Sidebar from "./components/Sidebar";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 240,
          backgroundColor: "#fff",
          boxShadow: 2,
          p: 2,
          borderRadius: 2,
        }}
      >
        <Sidebar />
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 4 }}>
        <CssBaseline />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;