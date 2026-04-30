// src/App.js
import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DataContext } from "./DataContext";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import UserManagement from "./pages/UserManagement";
import Loans from "./pages/Loans";
import Repayments from "./pages/Repayments";
import Dashboard from "./pages/Dashboard";
import GlobalReports from "./pages/GlobalReports";
import LoanAgingAnalysis from "./pages/LoanAgingAnalysis";
import MyReports from "./pages/MyReports";
import AccountOfficerManagement from "./pages/AccountOfficerManagement";
import LoanSettings from "./pages/LoanSettings";
import BranchManagement from "./pages/BranchManagement";
import StaffProfile from "./pages/StaffProfile";
import { Box, CircularProgress } from "@mui/material";

// ProtectedRoute component that checks authentication

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, authLoading, user } = useContext(DataContext);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// LoginRoute component that redirects authenticated users to dashboard
function LoginRoute() {
  const { isAuthenticated, authLoading } = useContext(DataContext);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}

function RegisterRoute() {
  const { isAuthenticated, authLoading } = useContext(DataContext);

  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Register />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Credit Admin">
              <Layout>
                <Admin />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute requiredRole="Super Admin">
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-officers"
          element={
            <ProtectedRoute requiredRole="Super Admin">
              <Layout>
                <AccountOfficerManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loan-settings"
          element={
            <ProtectedRoute requiredRole="Super Admin">
              <Layout>
                <LoanSettings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-management"
          element={
            <ProtectedRoute requiredRole="Super Admin">
              <Layout>
                <BranchManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loans"
          element={
            <ProtectedRoute>
              <Layout>
                <Loans />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repayments"
          element={
            <ProtectedRoute>
              <Layout>
                <Repayments />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/global-reports"
          element={
            <ProtectedRoute requiredRole="Supervisor">
              <Layout>
                <GlobalReports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/loan-aging-analysis"
          element={
            <ProtectedRoute requiredRole="Supervisor">
              <Layout>
                <LoanAgingAnalysis />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute requiredRole="Relationship Manager">
              <Layout>
                <MyReports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-profile"
          element={
            <ProtectedRoute requiredRole="Relationship Manager">
              <Layout>
                <StaffProfile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <h2>Welcome! Select a menu item.</h2>
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Catch-all redirect to login or dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;