import React, { useState, useContext } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";

const Admin = () => {
  const {
    loans,
    repayments,
    serverAvailable,
    syncCreateLoan,
    syncCreateRepayment,
    syncUpdateLoan,
    syncDeleteLoan,
    syncDeleteRepayment,
    syncUpdateRepayment,
    syncReplaceUnpaidRepayments,
  } = useContext(DataContext);

  const [newLoan, setNewLoan] = useState({
    customerName: "",
    amount: "",
    interestRate: "",
    tenor: "",
    startDate: "",
    officer: "",
    branch: "",
  });

  const [editingLoan, setEditingLoan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate schedule (array of repayment objects without id)
  const generateRepaymentSchedule = (loanId, loanData) => {
    const totalRepayable =
      Number(loanData.amount) +
      (Number(loanData.amount) * Number(loanData.interestRate || 0)) / 100;
    const tenor = Math.max(Number(loanData.tenor) || 1, 1);
    const monthlyRepayment = totalRepayable / tenor;
    const start = new Date(loanData.startDate);
    const schedule = [];

    for (let i = 0; i < tenor; i++) {
      const repaymentDate = new Date(start);
      repaymentDate.setMonth(start.getMonth() + i);
      schedule.push({
        loanId,
        customerName: loanData.customerName,
        loanAmount: Number(loanData.amount),
        date: repaymentDate.toISOString().split("T")[0],
        amount: monthlyRepayment,
        officer: loanData.officer,
        branch: loanData.branch,
        status: null,
      });
    }

    return schedule;
  };

  /* ---------------- Add Loan ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loanPayload = {
        customerName: newLoan.customerName,
        amount: Number(newLoan.amount),
        interestRate: Number(newLoan.interestRate),
        tenor: Number(newLoan.tenor),
        startDate: newLoan.startDate,
        officer: newLoan.officer,
        branch: newLoan.branch,
      };

      const createdLoan = await syncCreateLoan(loanPayload);

      const schedule = generateRepaymentSchedule(createdLoan.id, loanPayload);

      // create repayments in parallel
      await Promise.all(
        schedule.map((rep) =>
          syncCreateRepayment({
            ...rep,
            loanId: createdLoan.id,
          })
        )
      );

      setNewLoan({
        customerName: "",
        amount: "",
        interestRate: "",
        tenor: "",
        startDate: "",
        officer: "",
        branch: "",
      });
    } catch (err) {
      console.error("Failed to create loan or repayments:", err);
      alert("Error creating loan. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Delete Loan ---------------- */
  const handleDelete = async (loanId) => {
    const confirmDelete = window.confirm(
      "Delete this loan and all its repayments? This action cannot be undone."
    );
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await syncDeleteLoan(loanId);
    } catch (err) {
      console.error("Failed to delete loan:", err);
      alert("Error deleting loan. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Update Loan (preserve paid installments) ---------------- */
  const handleUpdate = async () => {
    if (!editingLoan) return;
    setLoading(true);

    try {
      const prevLoan = loans.find((l) => l.id === editingLoan.id);

      const amountChanged = Number(prevLoan.amount) !== Number(editingLoan.amount);
      const tenorChanged = Number(prevLoan.tenor) !== Number(editingLoan.tenor);
      const startDateChanged = prevLoan.startDate !== editingLoan.startDate;

      // Update loan metadata first
      await syncUpdateLoan(editingLoan.id, {
        customerName: editingLoan.customerName,
        amount: Number(editingLoan.amount),
        interestRate: Number(editingLoan.interestRate),
        tenor: Number(editingLoan.tenor),
        startDate: editingLoan.startDate,
        officer: editingLoan.officer,
        branch: editingLoan.branch,
      });

      if (amountChanged || tenorChanged || startDateChanged) {
        // Preserve paid repayments, replace unpaid ones via single server call

        // 1) Collect old repayments for this loan
        const oldReps = repayments
          .filter((r) => r.loanId === editingLoan.id)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2) Identify paid repayments and their dates
        const paidReps = oldReps.filter((r) => r.status === "✅");
        const paidDatesSet = new Set(paidReps.map((p) => p.date));

        // 3) Generate full new schedule
        const fullNewSchedule = generateRepaymentSchedule(editingLoan.id, editingLoan);

        // 4) Only send new repayments for dates that are not already paid
        const repsToCreate = fullNewSchedule.filter((rep) => !paidDatesSet.has(rep.date));

        // 5) Call single server endpoint to replace unpaid repayments
        await syncReplaceUnpaidRepayments(editingLoan.id, repsToCreate);

        // Note: paid repayments remain untouched; server inserts provided unpaid ones.
      } else {
        // No schedule-impacting changes: sync metadata into repayments
        const repsToUpdate = repayments.filter((r) => r.loanId === editingLoan.id);
        await Promise.all(
          repsToUpdate.map((r) =>
            syncUpdateRepayment(r.id, {
              ...r,
              customerName: editingLoan.customerName,
              loanAmount: Number(editingLoan.amount),
              officer: editingLoan.officer,
              branch: editingLoan.branch,
            })
          )
        );
      }

      setEditingLoan(null);
    } catch (err) {
      console.error("Failed to update loan or repayments:", err);
      alert("Error updating loan. See console for details.");
    } finally {
      setLoading(false);
    }
  };

/* ---------------- Toggle repayment status ---------------- */
const toggleStatus = async (rep) => {
  const nextStatus = rep.status === "✅" ? "❌" : rep.status === "❌" ? "⚪" : "✅";
  const updated = { ...rep, status: nextStatus };

  try {
    await syncUpdateRepayment(rep.id, updated);
  } catch (err) {
    console.error("Failed to update repayment status:", err);
    alert("Error updating repayment status. See console for details.");
  }
};

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Credit Admin
      </Typography>

      {loading && (
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">Saving changes…</Typography>
        </Box>
      )}

      {/* Loan Form */}
      <Box component="form" onSubmit={handleSubmit} mb={4}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Name"
              value={newLoan.customerName}
              onChange={(e) =>
                setNewLoan((s) => ({ ...s, customerName: e.target.value }))
              }
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Loan Amount"
              type="number"
              value={newLoan.amount}
              onChange={(e) => setNewLoan((s) => ({ ...s, amount: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Interest Rate (%)"
              type="number"
              value={newLoan.interestRate}
              onChange={(e) =>
                setNewLoan((s) => ({ ...s, interestRate: e.target.value }))
              }
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Tenor (months)"
              type="number"
              value={newLoan.tenor}
              onChange={(e) => setNewLoan((s) => ({ ...s, tenor: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={newLoan.startDate}
              onChange={(e) => setNewLoan((s) => ({ ...s, startDate: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Account Officer"
              value={newLoan.officer}
              onChange={(e) => setNewLoan((s) => ({ ...s, officer: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Branch"
              value={newLoan.branch}
              onChange={(e) => setNewLoan((s) => ({ ...s, branch: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ width: 200, my: 1, mx: 3 }}
              disabled={loading}
            >
              {loading ? "Working…" : "Add Loan"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Repayment Status Table */}
      <Typography variant="h5" gutterBottom>
        Manage Loans
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Loan ID</TableCell>
              <TableCell>Loan Amount</TableCell>
              <TableCell>Repayment Day</TableCell>
              <TableCell>Officer</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Repayments</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loans.map((loan) => {
              const loanRepayments = repayments
                .filter((r) => r.loanId === loan.id)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
              const repaymentDay = loan.startDate
                ? new Date(loan.startDate).getDate()
                : "-";

              return (
                <TableRow key={loan.id}>
                  <TableCell>{loan.customerName}</TableCell>
                  <TableCell>{loan.id}</TableCell>
                  <TableCell>${loan.amount}</TableCell>
                  <TableCell>{repaymentDay}</TableCell>
                  <TableCell>{loan.officer}</TableCell>
                  <TableCell>{loan.branch}</TableCell>
                  <TableCell>
                    {loanRepayments.map((r, idx) => (
                      <Button
                        key={`${r.id ?? "temp"}-${r.date}-${idx}`}
                        onClick={() => toggleStatus(r)}
                        variant="outlined"
                        size="small"
                        sx={{
                          mr: 1,
                          mb: 1,
                          color:
                            r.status === "✅"
                              ? "green"
                              : r.status === "❌"
                              ? "red"
                              : "gray",
                          borderColor:
                            r.status === "✅"
                              ? "green"
                              : r.status === "❌"
                              ? "red"
                              : "gray",
                        }}
                      >
                        {r.status || "⚪"}
                      </Button>
                    ))}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => setEditingLoan({ ...loan })}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(loan.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Loan Dialog */}
      <Dialog open={!!editingLoan} onClose={() => setEditingLoan(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Loan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Customer Name"
                value={editingLoan?.customerName || ""}
                onChange={(e) =>
                  setEditingLoan((s) => ({ ...s, customerName: e.target.value }))
                }
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Loan Amount"
                type="number"
                value={editingLoan?.amount || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, amount: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Interest Rate (%)"
                type="number"
                value={editingLoan?.interestRate || ""}
                onChange={(e) =>
                  setEditingLoan((s) => ({ ...s, interestRate: e.target.value }))
                }
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Tenor (months)"
                type="number"
                value={editingLoan?.tenor || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, tenor: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editingLoan?.startDate || ""}
                onChange={(e) =>
                  setEditingLoan((s) => ({ ...s, startDate: e.target.value }))
                }
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Account Officer"
                value={editingLoan?.officer || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, officer: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Branch"
                value={editingLoan?.branch || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, branch: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditingLoan(null)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained" color="primary" disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;