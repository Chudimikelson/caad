import React, { useState } from "react";
import { Box, CssBaseline, useTheme, useMediaQuery } from "@mui/material";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

const Layout = ({ children }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: dark ? "#0b1437" : "#f8fafc",
      }}
    >
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      {!isMobile && (
        <Box
          sx={{
            width: 248,
            backgroundColor: dark ? "#111c44" : "#fff",
            boxShadow: dark
              ? "0 20px 38px rgba(0, 0, 0, 0.34)"
              : "0 12px 28px rgba(15, 23, 42, 0.08)",
            p: 0,
            borderRadius: 0,
            flexShrink: 0,
          }}
        >
          <Sidebar />
        </Box>
      )}

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
        {/* Top Bar with mobile menu toggle */}
        <TopBar 
          isMobile={isMobile} 
          sidebarOpen={sidebarOpen} 
          onSidebarToggle={handleSidebarToggle}
        />

        {/* Mobile Sidebar Drawer */}
        {isMobile && (
          <Sidebar 
            isMobile={isMobile} 
            open={sidebarOpen} 
            onClose={handleSidebarClose}
          />
        )}

        {/* Page Content */}
        <Box sx={{ 
          flex: 1, 
          px: { xs: 2, sm: 3, md: 3 }, 
          pb: { xs: 2, sm: 3, md: 3 }, 
          pt: 0,
          width: "100%",
          overflowX: "hidden"
        }}>
          <CssBaseline />
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;