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

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, authLoading } = useContext(DataContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setClientError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setClientError("");
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };
      const result = await register(payload);
      if (!result.success) {
        setClientError(result.error);
      } else {
        setSuccessMessage("Registration successful. Redirecting to your dashboard...");
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      setClientError(err.message || "Registration failed. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 80% 20%, #d9f99d 0%, #ecfccb 20%, #f8fafc 55%)",
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
            border: "1px solid #d9f0cf",
            backgroundColor: "rgba(255, 255, 255, 0.93)",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Chip
              label="Get Started"
              sx={{
                mb: 1.5,
                bgcolor: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            />
            <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569" }}>
              Set up your CAAD profile to access the loan management workspace.
            </Typography>
          </Box>

          {clientError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setClientError("")}>
              {clientError}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage("")}>
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              margin="normal"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              disabled={authLoading}
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { backgroundColor: "#f8fafc" } }}
            />

            <TextField
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={authLoading}
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { backgroundColor: "#f8fafc" } }}
            />

            <TextField
              fullWidth
              id="password"
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              disabled={authLoading}
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
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { backgroundColor: "#f8fafc" } }}
            />

            <TextField
              fullWidth
              id="confirmPassword"
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={authLoading}
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
              sx={{ mb: 3, "& .MuiOutlinedInput-root": { backgroundColor: "#f8fafc" } }}
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
                background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #166534 0%, #22c55e 100%)",
                },
              }}
            >
              {authLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: "inherit" }} />
                  Registering...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              disabled={authLoading}
              onClick={() => navigate("/login")}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;
