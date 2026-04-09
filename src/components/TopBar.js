import React from "react";
import { AppBar, Toolbar, IconButton, Avatar, Box } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DarkModeIcon from "@mui/icons-material/DarkMode";

const TopBar = () => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "#fff",
        color: "#333",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "flex-end" }}>
        {/* Notification Bell */}
        <IconButton sx={{ color: "#1976d2" }}>
          <NotificationsIcon />
        </IconButton>

        {/* Dark Mode Toggle */}
        <IconButton sx={{ color: "#9c27b0" }}>
          <DarkModeIcon />
        </IconButton>

        {/* Profile Avatar */}
        <Box ml={2}>
          <Avatar
            alt="Profile"
            src="/static/images/avatar/1.jpg" // replace with your image
            sx={{ width: 40, height: 40 }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;