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
  Avatar,
  Chip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BarChartIcon from "@mui/icons-material/BarChart";


import { useContext } from "react";
import { DataContext } from "../DataContext";

const Sidebar = () => {
  const location = useLocation();
  const { user } = useContext(DataContext);

  let menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  ];
  if (user?.role === "Super Admin") {
    menuItems.push(
      { text: "User Management", icon: <PersonIcon />, path: "/user-management" }
    );
  } else if (user?.role === "Credit Admin") {
    menuItems.push(
      { text: "Loans", icon: <AccountBalanceIcon />, path: "/loans" },
      { text: "Repayments", icon: <ShoppingCartIcon />, path: "/repayments" },
      { text: "Admin", icon: <PersonIcon />, path: "/admin" }
    );
  } else if (user?.role === "Relationship Manager") {
    menuItems.push(
      { text: "My Reports", icon: <BarChartIcon />, path: "/my-reports" }
    );
  } else if (user?.role === "Supervisor") {
    menuItems.push(
      { text: "Global Reports", icon: <BarChartIcon />, path: "/global-reports" }
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
          backgroundColor: "#ffffff",
          borderRight: "none",
          boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      {/* Logo Section */}
      <Box sx={{ p: 3, textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>
        <Avatar
          src="/tagora-logo.png"
          sx={{
            width: 60,
            height: 60,
            mx: "auto",
            mb: 2,
            boxShadow: "none",
          }}
        />
      
        <Typography
          variant="body2"
          sx={{
            color: "#64748b",
            fontSize: "0.875rem",
            fontWeight: 500,
            mb: 1.5,
          }}
        >
          Loan Management System
        </Typography>
        <Chip
          size="small"
          label={user?.role || "User"}
          sx={{
            bgcolor: "#eef2ff",
            color: "#1e3a8a",
            fontWeight: 700,
            borderRadius: "8px",
          }}
        />
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ pt: 2, pb: 2, flex: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: "#64748b",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            px: 2,
            mb: 1,
            display: "block",
          }}
        >
          Navigation
        </Typography>
        <List sx={{ px: 0 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.text}
              component={Link}
              to={item.path}
              sx={{
                borderRadius: 0,
                mb: 0.5,
                pl: 2,
                pr: 3,
                py: 1.5,
                backgroundColor: "transparent",
                border: "none",
                borderRight: location.pathname === item.path
                  ? "4px solid #fbbf24"
                  : "4px solid transparent",
                boxSizing: "border-box",
                transition: "background-color 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(15, 23, 42, 0.04)",
                  transform: "translateX(4px)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path
                    ? "#1e3a8a"
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
                    color: location.pathname === item.path
                      ? "#1e3a8a"
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

      {/* Bottom Section */}
      <Box sx={{ p: 3, borderTop: "1px solid #e2e8f0" }}>
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            fontSize: "0.75rem",
            textAlign: "center",
            display: "block",
          }}
        >
          © 2024 Tagora Finance
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;