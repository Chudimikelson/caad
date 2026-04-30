import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { DataContext } from "../DataContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, authLoading } = useContext(DataContext);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    setClientError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setClientError("");
      const result = await login(formData);
      if (!result.success) {
        setClientError(result.error);
      }
    } catch (err) {
      setClientError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 18% 22%, #dbeafe 0%, #eff6ff 34%, #f8fafc 100%)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid #dbe7f5",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Chip
              label="CAAD Portal"
              sx={{
                mb: 1.5,
                bgcolor: "#e0e7ff",
                color: "#1e3a8a",
                fontWeight: 700,
              }}
            />
            <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569" }}>
              Sign in to manage loans, repayments, and portfolio insights.
            </Typography>
          </Box>

          {clientError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setClientError("")}>
              {clientError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={authLoading}
              variant="outlined"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f8fafc",
                },
              }}
            />

            <TextField
              fullWidth
              id="password"
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              disabled={authLoading}
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      disabled={authLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f8fafc",
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={authLoading}
              sx={{
                mb: 1.5,
                py: 1.2,
                fontSize: "1rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)",
                },
              }}
            >
              {authLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: "inherit" }} />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              disabled={authLoading}
              onClick={() => navigate("/register")}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              Create New Account
            </Button>
          </Box>

          <Typography variant="caption" sx={{ color: "#94a3b8", textAlign: "center", mt: 3, display: "block" }}>
            CAAD by Tagora Finance
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
