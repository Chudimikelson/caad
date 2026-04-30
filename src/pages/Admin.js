import React, { useState, useContext, useMemo } from "react";
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
  Badge,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  const [selectedLoanForModal, setSelectedLoanForModal] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    relationshipManager: "",
    branch: "",
    customerSearch: "",
  });

  const relationshipManagers = Array.from(
    new Set(
      [...loans, ...repayments]
        .map((record) => (typeof record.officer === "string" ? record.officer.trim() : ""))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

  const branches = useMemo(
    () =>
      Array.from(
        new Set(
          loans
            .map((loan) => (typeof loan.branch === "string" ? loan.branch.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [loans]
  );

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const disbursementDate = loan.startDate ? new Date(loan.startDate) : null;
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && disbursementDate && disbursementDate < startDate) {
        return false;
      }

      if (endDate && disbursementDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (disbursementDate > endOfDay) {
          return false;
        }
      }

      if (filters.relationshipManager && (loan.officer || "") !== filters.relationshipManager) {
        return false;
      }

      if (filters.branch && (loan.branch || "") !== filters.branch) {
        return false;
      }

      if (filters.customerSearch) {
        const customerName = (loan.customerName || "").toLowerCase();
        if (!customerName.includes(filters.customerSearch.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [loans, filters]);

  const filteredLoanIds = useMemo(
    () => new Set(filteredLoans.map((loan) => loan.id)),
    [filteredLoans]
  );

  const filteredRepayments = useMemo(
    () => repayments.filter((repayment) => filteredLoanIds.has(repayment.loanId)),
    [repayments, filteredLoanIds]
  );

  // Generate schedule (array of repayment objects without id)
  const addMonthsPreservingDay = (baseDate, monthsToAdd) => {
    const source = new Date(baseDate);
    const target = new Date(source);
    const originalDay = source.getDate();

    target.setDate(1);
    target.setMonth(target.getMonth() + monthsToAdd);

    const lastDayOfTargetMonth = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();

    target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
    return target;
  };

  const generateRepaymentSchedule = (loanId, loanData) => {
    const totalRepayable =
      Number(loanData.amount) +
      (Number(loanData.amount) * Number(loanData.interestRate || 0)) / 100;
    const tenor = Math.max(Number(loanData.tenor) || 1, 1);
    const monthlyRepayment = totalRepayable / tenor;
    const start = new Date(loanData.startDate);
    const schedule = [];

    for (let i = 0; i < tenor; i++) {
      const repaymentDate = addMonthsPreservingDay(start, i + 1);
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

const handleDeleteRepayment = async (repaymentId) => {
  const confirmDelete = window.confirm(
    "Delete this repayment record? This action cannot be undone."
  );
  if (!confirmDelete) return;

  setLoading(true);
  try {
    await syncDeleteRepayment(repaymentId);
  } catch (err) {
    console.error("Failed to delete repayment:", err);
    alert("Error deleting repayment. See console for details.");
  } finally {
    setLoading(false);
  }
};

const getOrdinalDay = (date) => {
  if (!date) return "-";
  const day = new Date(date).getDate();
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return day + "st";
  if (j === 2 && k !== 12) return day + "nd";
  if (j === 3 && k !== 13) return day + "rd";
  return day + "th";
};

const getStatusCounts = (loanId) => {
  const loanRepayments = repayments.filter((r) => r.loanId === loanId);
  const paid = loanRepayments.filter((r) => r.status === "✅").length;
  const pending = loanRepayments.filter((r) => r.status !== "✅" && r.status !== "❌").length;
  const missed = loanRepayments.filter((r) => r.status === "❌").length;
  return { paid, pending, missed, total: loanRepayments.length };
};

const allPaid = filteredRepayments.filter((r) => r.status === "✅").length;
const allPending = filteredRepayments.filter((r) => r.status !== "✅" && r.status !== "❌").length;
const allMissed = filteredRepayments.filter((r) => r.status === "❌").length;

const handleFilterChange = (field) => (event) => {
  setFilters((current) => ({ ...current, [field]: event.target.value }));
};

const resetFilters = () => {
  setFilters({
    startDate: "",
    endDate: "",
    relationshipManager: "",
    branch: "",
    customerSearch: "",
  });
};

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Credit Admin
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
        <Chip label={`Loans: ${filteredLoans.length}`} sx={{ bgcolor: "#e2e8f0", color: "#0f172a", fontWeight: 700 }} />
        <Chip label={`Paid: ${allPaid}`} sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 700 }} />
        <Chip label={`Pending: ${allPending}`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
        <Chip label={`Missed: ${allMissed}`} sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700 }} />
      </Stack>

      {loading && (
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">Saving changes...</Typography>
        </Box>
      )}

      {/* Loan Form */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add New Loan
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Loan Amount"
              type="number"
              value={newLoan.amount}
              onChange={(e) => setNewLoan((s) => ({ ...s, amount: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tenor (months)"
              type="number"
              value={newLoan.tenor}
              onChange={(e) => setNewLoan((s) => ({ ...s, tenor: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Account Officer</InputLabel>
              <Select
                value={newLoan.officer}
                label="Account Officer"
                onChange={(e) => setNewLoan((s) => ({ ...s, officer: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Select a Relationship Manager</em>
                </MenuItem>
                {relationshipManagers.map((managerName) => (
                  <MenuItem key={managerName} value={managerName}>
                    {managerName} (Relationship Manager)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Branch"
              value={newLoan.branch}
              onChange={(e) => setNewLoan((s) => ({ ...s, branch: e.target.value }))}
              required
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ width: 200, my: 1, mx: 3 }}
              disabled={loading}
            >
              {loading ? "Working..." : "Add Loan"}
            </Button>
          </Grid>
        </Grid>
      </Box>
      </Paper>

      {/* Repayment Status Table */}
      <Typography variant="h5" gutterBottom>
        Manage Repayments
      </Typography>

      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              label="Disbursement From"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={handleFilterChange("startDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              label="Disbursement To"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={handleFilterChange("endDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              select
              label="Relationship Manager"
              fullWidth
              value={filters.relationshipManager}
              onChange={handleFilterChange("relationshipManager")}
            >
              <MenuItem value="">All Relationship Managers</MenuItem>
              {relationshipManagers.map((manager) => (
                <MenuItem key={manager} value={manager}>
                  {manager}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              select
              label="Branch"
              fullWidth
              value={filters.branch}
              onChange={handleFilterChange("branch")}
            >
              <MenuItem value="">All Branches</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch} value={branch}>
                  {branch}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              label="Search Customer"
              placeholder="Search by customer name"
              fullWidth
              value={filters.customerSearch}
              onChange={handleFilterChange("customerSearch")}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Button variant="outlined" onClick={resetFilters}>
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
              <TableCell>Repayment Amount</TableCell>
              <TableCell>Repayment Day</TableCell>
              <TableCell>Repayment Status</TableCell>
              <TableCell>Account Officer</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                  No loans match the selected disbursement filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredLoans.map((loan) => {
              const loanRepayments = repayments
                .filter((r) => r.loanId === loan.id)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

              if (loanRepayments.length === 0) return null;

              const repaymentDay = getOrdinalDay(loan.startDate);
              const { paid, pending, missed, total } = getStatusCounts(loan.id);
              const monthlyInstallment = loanRepayments[0]?.amount || 0;

              return (
                <TableRow key={loan.id}>
                  <TableCell>{loan.customerName}</TableCell>
                  <TableCell>₦{monthlyInstallment?.toLocaleString() || "0"}</TableCell>
                  <TableCell>{repaymentDay}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedLoanForModal(loan.id)}
                    >
                      <Badge
                        badgeContent={paid}
                        color="success"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#4caf50",
                            color: "#fff",
                            fontSize: "12px",
                            padding: "0 6px",
                            borderRadius: "12px",
                          },
                        }}
                      >
                        <Box />
                      </Badge>
                      <Badge
                        badgeContent={pending}
                        color="warning"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#ff9800",
                            color: "#fff",
                            fontSize: "12px",
                            padding: "0 6px",
                            borderRadius: "12px",
                          },
                        }}
                      >
                        <Box />
                      </Badge>
                      <Badge
                        badgeContent={missed}
                        color="error"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#f44336",
                            color: "#fff",
                            fontSize: "12px",
                            padding: "0 6px",
                            borderRadius: "12px",
                          },
                        }}
                      >
                        <Box />
                      </Badge>
                    </Box>
                  </TableCell>
                  <TableCell>{loan.officer || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => setSelectedLoanForModal(loan.id)}
                      sx={{ mr: 1 }}
                    >
                      Manage
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
            }))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Loan Dialog */}
      <Dialog open={!!editingLoan} onClose={() => setEditingLoan(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Loan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Loan Amount"
                type="number"
                value={editingLoan?.amount || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, amount: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Tenor (months)"
                type="number"
                value={editingLoan?.tenor || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, tenor: e.target.value }))}
                fullWidth
                margin="normal"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Account Officer</InputLabel>
                <Select
                  value={editingLoan?.officer || ""}
                  label="Account Officer"
                  onChange={(e) => setEditingLoan((s) => ({ ...s, officer: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Select a Relationship Manager</em>
                  </MenuItem>
                  {relationshipManagers.map((managerName) => (
                    <MenuItem key={managerName} value={managerName}>
                      {managerName} (Relationship Manager)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
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

      {/* Repayment Management Modal */}
      <Dialog
        open={!!selectedLoanForModal}
        onClose={() => setSelectedLoanForModal(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Manage Repayment Status -{" "}
          {loans.find((l) => l.id === selectedLoanForModal)?.customerName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedLoanForModal && (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell>Repayment Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {repayments
                  .filter((r) => r.loanId === selectedLoanForModal)
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((r, idx) => (
                    <TableRow key={`${r.id ?? "temp"}-${r.date}-${idx}`}>
                      <TableCell>
                        {new Date(r.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        ₦{r.amount?.toLocaleString() || "0"}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => toggleStatus(r)}
                          variant="outlined"
                          size="small"
                          sx={{
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
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="text"
                          color="error"
                          size="small"
                          onClick={() => handleDeleteRepayment(r.id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLoanForModal(null)} color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;