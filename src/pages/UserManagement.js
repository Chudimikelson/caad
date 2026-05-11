import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { DataContext } from "../DataContext";
import { fetchUsers, updateUserRole, resetUserPassword, setUserSuspended, updateUserDetails, syncRelationshipManagerUsers } from "../api";

const ROLES = ["Super Admin", "Credit Admin", "Relationship Manager", "Supervisor"];

const UserManagement = () => {
  const { user } = useContext(DataContext);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, userId: "", userName: "" });
  const [editDialog, setEditDialog] = useState({
    open: false,
    userId: "",
    name: "",
    email: "",
    password: "",
  });
  const [newPassword, setNewPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to load users", severity: "error" });
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSyncRelationshipManagers = async () => {
    setSaving(true);
    try {
      const result = await syncRelationshipManagerUsers();
      await loadUsers();
      setSnackbar({
        open: true,
        message: `Sync complete: ${result.createdCount || 0} created, ${result.skippedCount || 0} skipped`,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to sync relationship managers", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role: newRole } : u)));
      setSnackbar({ open: true, message: "Role updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update role", severity: "error" });
    }
  };

  const handleSuspendToggle = async (target) => {
    if (target.email === user?.email) return;
    setSaving(true);
    try {
      const updated = await setUserSuspended(target._id, !target.isSuspended);
      setUsers((prev) => prev.map((u) => (u._id === target._id ? updated : u)));
      setSnackbar({ open: true, message: "User status updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update status", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openResetDialog = (target) => {
    setPasswordDialog({ open: true, userId: target._id, userName: target.name });
    setNewPassword("");
  };

  const openEditDialog = (target) => {
    setEditDialog({
      open: true,
      userId: target._id,
      name: target.name || "",
      email: target.email || "",
      password: "",
    });
  };

  const handleSaveEdit = async () => {
    const name = editDialog.name.trim();
    const email = editDialog.email.trim().toLowerCase();
    const password = editDialog.password.trim();

    if (!name) {
      setSnackbar({ open: true, message: "Name is required", severity: "warning" });
      return;
    }

    if (!email) {
      setSnackbar({ open: true, message: "Email is required", severity: "warning" });
      return;
    }

    if (password && password.length < 6) {
      setSnackbar({ open: true, message: "Password must be at least 6 characters", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const updated = await updateUserDetails(editDialog.userId, payload);
      setUsers((prev) => prev.map((u) => (u._id === editDialog.userId ? updated : u)));
      setSnackbar({ open: true, message: "User details updated", severity: "success" });
      setEditDialog({ open: false, userId: "", name: "", email: "", password: "" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update user", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.trim().length < 6) {
      setSnackbar({ open: true, message: "Password must be at least 6 characters", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await resetUserPassword(passwordDialog.userId, newPassword.trim());
      setSnackbar({ open: true, message: "Password reset successfully", severity: "success" });
      setPasswordDialog({ open: false, userId: "", userName: "" });
      setNewPassword("");
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to reset password", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3 }}>
      <Typography variant="h5" fontWeight={700} color="#1e3a8a">
        User Management
      </Typography>
      <Button variant="contained" onClick={handleSyncRelationshipManagers} disabled={saving || loading}>
        Sync Missing Relationship Managers
      </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ borderRadius: 0.5, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)", p: 2.5, border: "1px solid #e2e8f0" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(users) ? users : []).map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={u.role}
                          label="Role"
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          disabled={u.email === user?.email || u.isSuspended}
                        >
                          {ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {role}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.isSuspended ? "Suspended" : "Active"}
                        sx={{
                          bgcolor: u.isSuspended ? "#fee2e2" : "#dcfce7",
                          color: u.isSuspended ? "#991b1b" : "#166534",
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => openEditDialog(u)}>
                        Edit User
                      </Button>
                      <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => openResetDialog(u)}>
                        Reset Password
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={u.isSuspended ? "success" : "error"}
                        disabled={u.email === user?.email || saving}
                        onClick={() => handleSuspendToggle(u)}
                      >
                        {u.isSuspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, userId: "", name: "", email: "", password: "" })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            sx={{ mt: 1 }}
            value={editDialog.name}
            onChange={(e) => setEditDialog((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            sx={{ mt: 2 }}
            value={editDialog.email}
            onChange={(e) => setEditDialog((prev) => ({ ...prev, email: e.target.value }))}
          />
          <TextField
            fullWidth
            label="New Password (optional)"
            type="password"
            sx={{ mt: 2 }}
            value={editDialog.password}
            onChange={(e) => setEditDialog((prev) => ({ ...prev, password: e.target.value }))}
            helperText="Leave blank to keep the current password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, userId: "", name: "", email: "", password: "" })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, userId: "", userName: "" })} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password - {passwordDialog.userName}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            sx={{ mt: 1 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, userId: "", userName: "" })}>Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
