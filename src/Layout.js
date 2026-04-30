import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 248,
          backgroundColor: "#fff",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
          p: 0,
          borderRadius: 0,
        }}
      >
        <Sidebar />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <Box sx={{ flex: 1, px: 3, pb: 3, pt: 1 }}>
          <CssBaseline />
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;