import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
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

const LoanSettings = () => {
  const { syncFetchAllLoanTypes, syncCreateLoanType, syncUpdateLoanType } = useContext(DataContext);
  const [loanTypes, setLoanTypes] = useState([]);
  const [draftRates, setDraftRates] = useState({});
  const [newType, setNewType] = useState({ name: "", interestRate: "" });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadLoanTypes = useCallback(async () => {
    try {
      const data = await syncFetchAllLoanTypes();
      setLoanTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to load loan types", severity: "error" });
      setLoanTypes([]);
    }
  }, [syncFetchAllLoanTypes]);

  useEffect(() => {
    loadLoanTypes();
  }, [loadLoanTypes]);

  const handleCreate = async () => {
    const name = newType.name.trim();
    const rawRate = String(newType.interestRate).trim();
    const interestRate = Number(rawRate);

    if (!name || rawRate === "" || Number.isNaN(interestRate) || interestRate < 0) {
      setSnackbar({ open: true, message: "Enter valid loan type and interest rate", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await syncCreateLoanType(name, interestRate);
      await loadLoanTypes();
      setNewType({ name: "", interestRate: "" });
      setSnackbar({ open: true, message: "Loan type created", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to create loan type", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRate = async (lt) => {
    const raw = String(draftRates[lt.id] ?? "").trim();
    if (raw === "") {
      setSnackbar({ open: true, message: "Enter interest rate before saving", severity: "warning" });
      return;
    }
    const rate = Number(raw);
    if (Number.isNaN(rate) || rate < 0) {
      setSnackbar({ open: true, message: "Interest rate must be 0 or greater", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await syncUpdateLoanType(lt.id, { interestRate: rate });
      await loadLoanTypes();
      setSnackbar({ open: true, message: "Loan type updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update loan type", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (lt) => {
    setSaving(true);
    try {
      await syncUpdateLoanType(lt.id, { isActive: !lt.isActive });
      await loadLoanTypes();
      setSnackbar({ open: true, message: "Loan type status updated", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update status", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={3} color="#1e3a8a">
        Loan Settings
      </Typography>

      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth label="Loan Type" value={newType.name} onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth type="number" label="Monthly Interest Rate (%)" value={newType.interestRate} onChange={(e) => setNewType((p) => ({ ...p, interestRate: e.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Button fullWidth variant="contained" onClick={handleCreate} disabled={saving} sx={{ height: "100%" }}>
              Add Loan Type
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Loan Type</TableCell>
                <TableCell>Monthly Interest Rate (%)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loanTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell>{lt.name}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={draftRates[lt.id] ?? lt.interestRate}
                      onChange={(e) => setDraftRates((prev) => ({ ...prev, [lt.id]: e.target.value }))}
                      sx={{ width: 140 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={lt.isActive ? "Active" : "Inactive"} sx={{ bgcolor: lt.isActive ? "#dcfce7" : "#fee2e2", color: lt.isActive ? "#166534" : "#991b1b", fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleSaveRate(lt)}>Save Rate</Button>
                    <Button size="small" variant="outlined" onClick={() => handleToggle(lt)}>{lt.isActive ? "Deactivate" : "Activate"}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LoanSettings;
