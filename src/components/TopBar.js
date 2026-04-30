import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Box,
  Button,
  Typography,
  Popover,
  Chip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import { useContext, useState } from "react";
import { DataContext } from "../DataContext";

const TopBar = () => {
  const { user, logout, themeMode, toggleThemeMode } = useContext(DataContext);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleOpenProfileMenu = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setProfileAnchorEl(null);
  };

  const isProfileMenuOpen = Boolean(profileAnchorEl);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        color: "#0f172a",
        borderBottom: "none",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          minHeight: 86,
          px: { xs: 2, md: 3 },
        }}
      >
        {/* Left side */}
        <Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
            {today}
          </Typography>
          <Typography variant="h6" sx={{ color: "#1e3a8a", fontWeight: 700, lineHeight: 1.2 }}>
            TAGORA FINANCIAL SERVICES LTD
          </Typography>
        </Box>

        {/* Right side - notifications, dark mode, user info */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            bgcolor: "#ffffff",
            borderRadius: 999,
            px: 1,
            py: 0.5,
            border: "1px solid #e2e8f0",
            boxShadow: "0 14px 24px rgba(15, 23, 42, 0.08)",
          }}
        >
          {/* Notification Bell */}
          <IconButton
            onClick={toggleThemeMode}
            sx={{
              color: "#1e3a8a",
              backgroundColor: "#f8fafc",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: { xs: "none", sm: "inline-flex" },
              "&:hover": { backgroundColor: "#eef2ff" },
            }}
          >
            <NotificationsIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Dark Mode Toggle */}
          <IconButton
            sx={{
              color: "#1e3a8a",
              backgroundColor: "#f8fafc",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: { xs: "none", sm: "inline-flex" },
              "&:hover": { backgroundColor: "#eef2ff" },
            }}
          >
            {themeMode === "dark" ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
          </IconButton>

          {/* User Info */}
          {user && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                ml: 0.5,
                pl: 1,
                borderLeft: "1px solid #e2e8f0",
              }}
            >
              <Typography variant="body2" sx={{ mr: 1, color: "#475569", fontWeight: 600 }}>
                {user.name || user.email}
              </Typography>
              <Chip
                size="small"
                label={user.role}
                sx={{
                  mr: 1,
                  bgcolor: "#eef2ff",
                  color: "#1e3a8a",
                  fontWeight: 700,
                  display: { xs: "none", md: "inline-flex" },
                }}
              />
              <Avatar
                alt="Profile"
                src="/static/images/avatar/1.jpg"
                onClick={handleOpenProfileMenu}
                sx={{
                  width: 32,
                  height: 32,
                  mr: 0.5,
                  bgcolor: "#1e3a8a",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {userInitial}
              </Avatar>
            </Box>
          )}
        </Box>
      </Toolbar>

      <Popover
        open={isProfileMenuOpen}
        anchorEl={profileAnchorEl}
        onClose={handleCloseProfileMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1.2,
            width: { xs: 260, sm: 300 },
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.16)",
            p: 2,
          },
        }}
      >
        <Box
          sx={{
            p: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              alt="Profile"
              src="/static/images/avatar/1.jpg"
              sx={{
                width: 44,
                height: 44,
                bgcolor: "#1e3a8a",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {userInitial}
            </Avatar>
            <Box>
              <Typography
                id="profile-modal-title"
                variant="subtitle1"
                sx={{ color: "#1e3a8a", fontWeight: 700, lineHeight: 1.2 }}
              >
                Profile
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                {user?.name || user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                {user?.role}
              </Typography>
            </Box>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={async () => {
              handleCloseProfileMenu();
              await handleLogout();
            }}
            sx={{
              textTransform: "none",
              borderColor: "#1e3a8a",
              color: "#1e3a8a",
              fontWeight: 700,
              borderRadius: 2,
              py: 1,
              "&:hover": {
                borderColor: "#1e3a8a",
                backgroundColor: "rgba(251, 191, 36, 0.12)",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Popover>
    </AppBar>
  );
};

export default TopBar;