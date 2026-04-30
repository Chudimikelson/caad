import React, { useEffect, useState, useContext } from "react";
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
} from "@mui/material";
import { DataContext } from "../DataContext";
import { fetchUsers, updateUserRole } from "../api";

const ROLES = ["Super Admin", "Credit Admin", "Relationship Manager", "Supervisor"];

const UserManagement = () => {
  const { user } = useContext(DataContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await fetchUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setSnackbar({ open: true, message: err.message || "Failed to load users", severity: "error" });
        setUsers([]);
      }
      setLoading(false);
    };
    loadUsers();
  }, []);

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUserRole(id, newRole);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role: newRole } : u)));
      setSnackbar({ open: true, message: "Role updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update role", severity: "error" });
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={3} color="#1e3a8a">
        User Management
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ borderRadius: 3, boxShadow: 2, p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Created</TableCell>
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
                          disabled={u.email === user?.email}
                        >
                          {ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {role}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
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
