import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataContext } from "../DataContext";
import { fetchBranches, createBranch, updateBranch, assignCustomerToBranch, assignOfficerToBranch } from "../api";

const BranchManagement = () => {
  const { loans, officers, syncLoadAllOfficers } = useContext(DataContext);
  const [branches, setBranches] = useState([]);
  const [branchDrafts, setBranchDrafts] = useState({});
  const [newBranchName, setNewBranchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [customerAssign, setCustomerAssign] = useState({ customerName: "", branch: "" });
  const [officerAssign, setOfficerAssign] = useState({ officerName: "", branch: "" });

  const customers = useMemo(
    () => Array.from(new Set((loans || []).map((l) => (l.customerName || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [loans]
  );

  const officerNames = useMemo(
    () => Array.from(new Set((officers || []).map((o) => (o.name || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [officers]
  );

  const loadBranches = async () => {
    try {
      const data = await fetchBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to load branches", severity: "error" });
      setBranches([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      await loadBranches();
      try {
        await syncLoadAllOfficers();
      } catch (err) {
        // no-op; snackbar already used for branch errors
      }
    };
    load();
  }, [syncLoadAllOfficers]);

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) {
      setSnackbar({ open: true, message: "Branch name is required", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await createBranch(name);
      await loadBranches();
      setNewBranchName("");
      setSnackbar({ open: true, message: "Branch created", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to create branch", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRenameBranch = async (branch) => {
    const nextName = String(branchDrafts[branch.id] ?? "").trim();
    if (!nextName) {
      setSnackbar({ open: true, message: "Enter a branch name", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await updateBranch(branch.id, nextName);
      await loadBranches();
      setSnackbar({ open: true, message: "Branch name updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to rename branch", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignCustomer = async () => {
    if (!customerAssign.customerName || !customerAssign.branch) {
      setSnackbar({ open: true, message: "Select customer and branch", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await assignCustomerToBranch(customerAssign);
      setCustomerAssign({ customerName: "", branch: "" });
      setSnackbar({ open: true, message: "Customer assigned to branch", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to assign customer", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!officerAssign.officerName || !officerAssign.branch) {
      setSnackbar({ open: true, message: "Select officer and branch", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await assignOfficerToBranch(officerAssign);
      setOfficerAssign({ officerName: "", branch: "" });
      setSnackbar({ open: true, message: "Relationship manager assigned to branch", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to assign officer", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={3} color="#1e3a8a">
        Branch Management
      </Typography>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Create Branch</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label="Branch Name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button fullWidth variant="contained" onClick={handleCreateBranch} disabled={saving} sx={{ height: "100%" }}>Create</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Assign Customer to Branch</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Customer" value={customerAssign.customerName} onChange={(e) => setCustomerAssign((p) => ({ ...p, customerName: e.target.value }))}>
                  <MenuItem value="">Select customer</MenuItem>
                  {customers.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Branch" value={customerAssign.branch} onChange={(e) => setCustomerAssign((p) => ({ ...p, branch: e.target.value }))}>
                  <MenuItem value="">Select branch</MenuItem>
                  {branches.map((b) => <MenuItem key={b.id} value={b.name}>{b.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button variant="contained" onClick={handleAssignCustomer} disabled={saving}>Assign Customer</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Assign Relationship Manager to Branch</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Relationship Manager" value={officerAssign.officerName} onChange={(e) => setOfficerAssign((p) => ({ ...p, officerName: e.target.value }))}>
                  <MenuItem value="">Select officer</MenuItem>
                  {officerNames.map((name) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Branch" value={officerAssign.branch} onChange={(e) => setOfficerAssign((p) => ({ ...p, branch: e.target.value }))}>
                  <MenuItem value="">Select branch</MenuItem>
                  {branches.map((b) => <MenuItem key={b.id} value={b.name}>{b.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button variant="contained" onClick={handleAssignOfficer} disabled={saving}>Assign Officer</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Edit Branch Names</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Current Name</TableCell>
                    <TableCell>New Name</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>{branch.name}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={branchDrafts[branch.id] ?? branch.name}
                          onChange={(e) => setBranchDrafts((p) => ({ ...p, [branch.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleRenameBranch(branch)}>Save Name</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BranchManagement;
