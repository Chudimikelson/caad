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
  useTheme,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { useContext, useState } from "react";
import { DataContext } from "../DataContext";

const TopBar = ({ isMobile = false, sidebarOpen = false, onSidebarToggle = () => {} }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
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
        color: dark ? "#f8fbff" : "#0f172a",
        borderBottom: "none",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: { xs: 64, sm: 86 },
          px: { xs: 1.5, sm: 2, md: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Mobile menu button */}
        {isMobile && (
          <IconButton
            onClick={onSidebarToggle}
            aria-label="Toggle menu"
            sx={{
              color: dark ? "#bfdbfe" : "#1e3a8a",
              fontSize: "1.5rem",
              display: { xs: "inline-flex", md: "none" },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Title section */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: dark ? "#a3aed0" : "#64748b", 
              fontWeight: 600,
              fontSize: { xs: "0.65rem", sm: "0.75rem" }
            }}
          >
            {today}
          </Typography>
  
        </Box>

        {/* Right section with controls */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 0.75 },
            bgcolor: dark ? "rgba(17, 28, 68, 0.72)" : "#ffffff",
            backdropFilter: dark ? "blur(8px)" : "none",
            borderRadius: 999,
            px: { xs: 0.75, sm: 1 },
            py: { xs: 0.5, sm: 0.5 },
            border: dark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0",
            boxShadow: dark
              ? "0 16px 30px rgba(0, 0, 0, 0.34)"
              : "0 14px 24px rgba(15, 23, 42, 0.08)",
            flexShrink: 0,
          }}
        >
          <IconButton
            sx={{
              color: dark ? "#bfdbfe" : "#1e3a8a",
              backgroundColor: dark ? "rgba(59, 130, 246, 0.14)" : "#f8fafc",
              borderRadius: "50%",
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              display: { xs: "none", sm: "inline-flex" },
              "&:hover": {
                backgroundColor: dark ? "rgba(59, 130, 246, 0.24)" : "#eef2ff",
              },
            }}
          >
            <NotificationsIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          </IconButton>

          <IconButton
            onClick={toggleThemeMode}
            aria-label="Toggle dark mode"
            sx={{
              color: dark ? "#bfdbfe" : "#1e3a8a",
              backgroundColor: dark ? "rgba(59, 130, 246, 0.14)" : "#f8fafc",
              borderRadius: "50%",
              width: { xs: 32, sm: 36 },
              height: { xs: 32, sm: 36 },
              display: "inline-flex",
              "&:hover": {
                backgroundColor: dark ? "rgba(59, 130, 246, 0.24)" : "#eef2ff",
              },
            }}
          >
            {themeMode === "dark" ? <LightModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} /> : <DarkModeIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
          </IconButton>

          {user && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                ml: { xs: 0, sm: 0.5 },
                pl: { xs: 0, sm: 1 },
                borderLeft: { xs: "none", sm: dark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0" },
                gap: { xs: 0.5, sm: 1 },
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: { xs: 0, sm: 1 }, 
                  color: dark ? "#d6def3" : "#475569", 
                  fontWeight: 600,
                  display: { xs: "none", sm: "inline" },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: { xs: "100px", md: "150px" },
                }}
              >
                {user.name || user.email}
              </Typography>
              <Chip
                size="small"
                label={user.role}
                sx={{
                  mr: { xs: 0, sm: 1 },
                  bgcolor: dark ? "rgba(59, 130, 246, 0.18)" : "#eef2ff",
                  color: dark ? "#e5efff" : "#1e3a8a",
                  fontWeight: 700,
                  display: { xs: "none", md: "inline-flex" },
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  height: { xs: 24, sm: 28 },
                }}
              />
              <Avatar
                alt="Profile"
                src="/static/images/avatar/1.jpg"
                onClick={handleOpenProfileMenu}
                sx={{
                  width: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  mr: { xs: 0, sm: 0.5 },
                  bgcolor: dark ? "#3b5aa8" : "#1e3a8a",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
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
            bgcolor: dark ? "#111c44" : "#ffffff",
            border: dark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid #e2e8f0",
            borderRadius: 3,
            boxShadow: dark
              ? "0 20px 38px rgba(0, 0, 0, 0.5)"
              : "0 18px 36px rgba(15, 23, 42, 0.16)",
            p: 2,
          },
        }}
      >
        <Box sx={{ p: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              alt="Profile"
              src="/static/images/avatar/1.jpg"
              sx={{
                width: 44,
                height: 44,
                bgcolor: dark ? "#3b5aa8" : "#1e3a8a",
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
                sx={{ color: dark ? "#f8fbff" : "#1e3a8a", fontWeight: 700, lineHeight: 1.2 }}
              >
                Profile
              </Typography>
              <Typography variant="body2" sx={{ color: dark ? "#a3aed0" : "#64748b" }}>
                {user?.name || user?.email}
              </Typography>
              <Typography variant="caption" sx={{ color: dark ? "#a3aed0" : "#94a3b8" }}>
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
              borderColor: dark ? "#3b82f6" : "#1e3a8a",
              color: dark ? "#e8f1ff" : "#1e3a8a",
              fontWeight: 700,
              borderRadius: 2,
              py: 1,
              "&:hover": {
                borderColor: dark ? "#3b82f6" : "#1e3a8a",
                backgroundColor: dark
                  ? "rgba(59, 130, 246, 0.2)"
                  : "rgba(251, 191, 36, 0.12)",
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