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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Loans", icon: <BarChartIcon />, path: "/loans" },
    { text: "Repayments", icon: <ShoppingCartIcon />, path: "/repayments" },
    { text: "CAAD", icon: <PersonIcon />, path: "/admin" },
    { text: "Sign In", icon: <LockIcon />, path: "/signin" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 240,
          boxSizing: "border-box",
          backgroundColor: "#fff",
          borderRight: "1px solid #e0e0e0",
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1976d2" }}>
          TAGORA FINANCE
        </Typography>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            sx={{
              backgroundColor:
                location.pathname === item.path ? "#1976d2" : "transparent",
              color: location.pathname === item.path ? "#fff" : "#333",
              borderRadius: 1,
              mx: 1,
              my: 0.5,
              "&:hover": {
                backgroundColor:
                  location.pathname === item.path ? "#1565c0" : "#f5f5f5",
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === item.path ? "#fff" : "#1976d2",
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>

      {/* Decorative gradient circle at bottom */}
      <Box
        sx={{
          mt: "auto",
          p: 2,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1976d2, #9c27b0)",
          }}
        />
      </Box>
    </Drawer>
  );
};

export default Sidebar;