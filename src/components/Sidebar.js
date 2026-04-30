import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  useTheme,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useContext } from "react";
import { DataContext } from "../DataContext";

const Sidebar = ({ isMobile = false, open = false, onClose = () => {} }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const location = useLocation();
  const { user } = useContext(DataContext);

  let menuItems = [];

  if (user?.role === "Supervisor") {
    menuItems = [
      { text: "Global Reports", icon: <BarChartIcon />, path: "/global-reports" },
      { text: "Loans", icon: <AccountBalanceIcon />, path: "/loans" },
      { text: "Repayments", icon: <ShoppingCartIcon />, path: "/repayments" },
      { text: "Loan Aging Analysis", icon: <BarChartIcon />, path: "/loan-aging-analysis" },
    ];
  } else if (user?.role === "Super Admin") {
    menuItems = [
      { text: "User Management", icon: <PersonIcon />, path: "/user-management" },
      { text: "Account Officer Management", icon: <PersonIcon />, path: "/account-officers" },
      { text: "Loan Settings", icon: <AccountBalanceIcon />, path: "/loan-settings" },
      { text: "Branch Management", icon: <BarChartIcon />, path: "/branch-management" },
    ];
  } else if (user?.role === "Credit Admin") {
    menuItems = [
      { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
      { text: "Loans", icon: <AccountBalanceIcon />, path: "/loans" },
      { text: "Repayments", icon: <ShoppingCartIcon />, path: "/repayments" },
      { text: "Admin", icon: <PersonIcon />, path: "/admin" },
    ];
  } else if (user?.role === "Relationship Manager") {
    menuItems = [
      { text: "Dashboard", icon: <DashboardIcon />, path: "/my-reports" },
      { text: "Loans", icon: <AccountBalanceIcon />, path: "/loans" },
      { text: "Repayments", icon: <ShoppingCartIcon />, path: "/repayments" },
      { text: "My Profile", icon: <PersonIcon />, path: "/staff-profile" },
    ];
  } else {
    menuItems = [{ text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" }];
  }

  const SidebarContent = (
    <>
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          borderBottom: dark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
        }}
      >
        <Box
          component="img"
          src="/tagora-logo.png"
          alt="Tagora logo"
          sx={{
            width: 82,
            height: "auto",
            mx: "auto",
            mb: 0.75,
            display: "block",
            borderRadius: 0,
            objectFit: "contain",
          }}
        />

        <Typography
          variant="body2"
          sx={{
            color: "#032A78",
            fontFamily: "'Poppins', 'Manrope', 'Nunito Sans', sans-serif",
            fontSize: "26px",
            lineHeight: 1,
            fontWeight: 700,
            mb: 1.25,
            letterSpacing: "0",
            textTransform: "uppercase",
            textAlign: "center",
            textShadow: "none",
          }}
        >
          TAGORA
        </Typography>

        <Chip
          size="small"
          label={user?.role || "User"}
          sx={{
            bgcolor: dark ? "rgba(59,130,246,0.18)" : "#eef2ff",
            color: dark ? "#d7e7ff" : "#1e3a8a",
            fontWeight: 700,
            borderRadius: "8px",
          }}
        />
      </Box>

      <Box sx={{ pt: 2, pb: 2, flex: 1 }}>
        <List sx={{ px: 0 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              component={Link}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              sx={{
                borderRadius: 0,
                mb: 0.5,
                pl: 2,
                pr: 3,
                py: 1.5,
                backgroundColor: "transparent",
                border: "none",
                borderRight:
                  location.pathname === item.path
                    ? dark
                      ? "4px solid #3b82f6"
                      : "4px solid #fbbf24"
                    : "4px solid transparent",
                boxSizing: "border-box",
                transition: "background-color 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  backgroundColor: dark ? "rgba(59, 130, 246, 0.14)" : "rgba(15, 23, 42, 0.04)",
                  transform: "translateX(4px)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? dark
                        ? "#bfdbfe"
                        : "#1e3a8a"
                      : dark
                      ? "rgba(163, 174, 208, 0.78)"
                      : "rgba(107, 114, 128, 0.55)",
                  minWidth: 40,
                  transition: "color 0.3s ease",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  sx: {
                    color:
                      location.pathname === item.path
                        ? dark
                          ? "#f8fbff"
                          : "#1e3a8a"
                        : dark
                        ? "rgba(163, 174, 208, 0.95)"
                        : "rgba(107, 114, 128, 0.65)",
                    fontWeight: location.pathname === item.path ? 700 : 500,
                    fontSize: "0.95rem",
                    transition: "color 0.3s ease",
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ p: 3, borderTop: dark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0" }}>
        <Typography
          variant="caption"
          sx={{
            color: dark ? "#a3aed0" : "#64748b",
            fontSize: "0.75rem",
            textAlign: "center",
            display: "block",
          }}
        >
          © 2024 Tagora Finance
        </Typography>
      </Box>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: 248,
            boxSizing: "border-box",
            background: dark ? "linear-gradient(180deg, #141f4a 0%, #101a40 100%)" : "#ffffff",
            borderRight: "none",
            boxShadow: dark
              ? "0 20px 38px rgba(0, 0, 0, 0.34)"
              : "0 14px 32px rgba(15, 23, 42, 0.08)",
          },
        }}
      >
        {SidebarContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 248,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 248,
          boxSizing: "border-box",
          background: dark ? "linear-gradient(180deg, #141f4a 0%, #101a40 100%)" : "#ffffff",
          borderRight: "none",
          boxShadow: dark
            ? "0 20px 38px rgba(0, 0, 0, 0.34)"
            : "0 14px 32px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      {SidebarContent}
    </Drawer>
  );
};

export default Sidebar;