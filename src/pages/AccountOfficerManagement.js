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
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataContext } from "../DataContext";

const AccountOfficerManagement = () => {
  const {
    loans,
    officers,
    syncLoadAllOfficers,
    syncCreateOfficer,
    syncToggleOfficerStatus,
    syncFetchRelationshipManagers,
    syncReassignCustomerManager,
  } = useContext(DataContext);

  const [newOfficer, setNewOfficer] = useState({ name: "", branch: "" });
  const [relationshipManagers, setRelationshipManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [assignForm, setAssignForm] = useState({ customerName: "", fromOfficer: "", toOfficer: "" });

  const customerOptions = useMemo(() => {
    const grouped = new Map();
    (loans || []).forEach((loan) => {
      const customerName = (loan.customerName || "").trim();
      const officer = (loan.officer || "").trim();
      if (!customerName) return;
      if (!grouped.has(customerName)) grouped.set(customerName, new Set());
      if (officer) grouped.get(customerName).add(officer);
    });
    return Array.from(grouped.entries())
      .map(([customerName, officerSet]) => ({ customerName, officers: Array.from(officerSet) }))
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [loans]);

  useEffect(() => {
    const load = async () => {
      try {
        await syncLoadAllOfficers();
        const managers = await syncFetchRelationshipManagers();
        setRelationshipManagers(Array.isArray(managers) ? managers : []);
      } catch (err) {
        setSnackbar({ open: true, message: err.message || "Failed to load data", severity: "error" });
      }
    };
    load();
  }, [syncLoadAllOfficers, syncFetchRelationshipManagers]);

  const handleCreateOfficer = async () => {
    if (!newOfficer.name.trim() || !newOfficer.branch.trim()) {
      setSnackbar({ open: true, message: "Officer name and branch are required", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      await syncCreateOfficer(newOfficer.name.trim(), newOfficer.branch.trim());
      await syncLoadAllOfficers();
      const managers = await syncFetchRelationshipManagers();
      setRelationshipManagers(Array.isArray(managers) ? managers : []);
      setNewOfficer({ name: "", branch: "" });
      setSnackbar({ open: true, message: "Account officer created", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to create officer", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOfficer = async (id) => {
    setSaving(true);
    try {
      await syncToggleOfficerStatus(id);
      await syncLoadAllOfficers();
      setSnackbar({ open: true, message: "Officer status updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update officer", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCustomerChange = (customerName) => {
    const selected = customerOptions.find((c) => c.customerName === customerName);
    setAssignForm((prev) => ({
      ...prev,
      customerName,
      fromOfficer: selected?.officers?.[0] || "",
    }));
  };

  const handleAssignCustomer = async () => {
    if (!assignForm.customerName || !assignForm.toOfficer) {
      setSnackbar({ open: true, message: "Select customer and target officer", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      await syncReassignCustomerManager(assignForm);
      setSnackbar({ open: true, message: "Customer assigned to account officer", severity: "success" });
      setAssignForm({ customerName: "", fromOfficer: "", toOfficer: "" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to assign customer", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={3} color="#1e3a8a">
        Account Officer Management
      </Typography>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Create Account Officer</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Officer Name"
                  value={newOfficer.name}
                  onChange={(e) => setNewOfficer((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Branch"
                  value={newOfficer.branch}
                  onChange={(e) => setNewOfficer((prev) => ({ ...prev, branch: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button variant="contained" onClick={handleCreateOfficer} disabled={saving}>Create Officer</Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Assign Customer to Account Officer</Typography>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Customer" value={assignForm.customerName} onChange={(e) => handleCustomerChange(e.target.value)}>
                  <MenuItem value="">Select customer</MenuItem>
                  {customerOptions.map((item) => (
                    <MenuItem key={item.customerName} value={item.customerName}>{item.customerName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Current Officer" value={assignForm.fromOfficer} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Target Officer" value={assignForm.toOfficer} onChange={(e) => setAssignForm((prev) => ({ ...prev, toOfficer: e.target.value }))}>
                  <MenuItem value="">Select account officer</MenuItem>
                  {relationshipManagers.map((rm) => (
                    <MenuItem key={rm} value={rm}>{rm}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Button variant="contained" onClick={handleAssignCustomer} disabled={saving} sx={{ mt: { xs: 0, sm: 1 } }}>
                  Assign Customer
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Account Officers</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Branch</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(officers || []).map((officer) => (
                    <TableRow key={officer.id}>
                      <TableCell>{officer.name}</TableCell>
                      <TableCell>{officer.branch}</TableCell>
                      <TableCell>
                        <Chip size="small" label={officer.isActive ? "Active" : "Inactive"} sx={{ bgcolor: officer.isActive ? "#dcfce7" : "#fee2e2", color: officer.isActive ? "#166534" : "#991b1b", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleToggleOfficer(officer.id)}>
                          {officer.isActive ? "Deactivate" : "Activate"}
                        </Button>
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

export default AccountOfficerManagement;
