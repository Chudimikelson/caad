import React, { useState, useContext, useMemo, useEffect, useCallback } from "react";
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
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { fetchAvailableBranches } from "../api";
import { buildLoanCycleMap, getLoanCycle } from "../utils/loanCycle";

const Admin = () => {
  const {
    loans,
    repayments,
    loanTypes,
    syncCreateLoan,
    syncCreateRepayment,
    syncUpdateLoan,
    syncDeleteRepayment,
    syncUpdateRepayment,
    syncReplaceUnpaidRepayments,
  } = useContext(DataContext);

  const [newLoan, setNewLoan] = useState({
    customerName: "",
    amount: "",
    loanType: "",
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
    loanStatus: "",
    repaymentStatus: "",
  });
  const [availableBranches, setAvailableBranches] = useState([]);
  const [copiedLoanId, setCopiedLoanId] = useState(null);

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

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await fetchAvailableBranches();
        const names = Array.isArray(data)
          ? data.map((b) => String(b.name || "").trim()).filter(Boolean)
          : [];
        setAvailableBranches(names);
      } catch (err) {
        // Fallback to loan-derived branches if catalog endpoint fails.
        setAvailableBranches([]);
      }
    };

    loadBranches();
  }, []);

  const branchOptions = useMemo(() => {
    const merged = new Set([...(availableBranches || []), ...branches]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [availableBranches, branches]);

  const loanTypeRateByName = useMemo(() => {
    const pairs = (loanTypes || []).map((lt) => [lt.name, Number(lt.interestRate || 0)]);
    return new Map(pairs);
  }, [loanTypes]);
  const loanCycleMap = useMemo(() => buildLoanCycleMap(loans), [loans]);

  // Keep month/day alignment stable when source day exceeds target month length.
  const addMonthsPreservingDay = useCallback((baseDate, monthsToAdd) => {
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
  }, []);

  const getLoanLifecycleStatus = useCallback((loan) => {
    const tenor = Math.max(Number(loan.tenor) || 0, 0);
    const loanRepayments = repayments.filter((r) => r.loanId === loan.id);
    const paidCount = loanRepayments.filter((r) => r.status === "✅").length;

    if (tenor > 0 && paidCount >= tenor) {
      return "Closed";
    }

    if (!loan.startDate || tenor <= 0) {
      return "Active";
    }

    const maturityDate = addMonthsPreservingDay(loan.startDate, tenor);
    const now = new Date();
    return now >= maturityDate ? "Overdue" : "Active";
  }, [repayments, addMonthsPreservingDay]);

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

      if (filters.loanStatus) {
        if (getLoanLifecycleStatus(loan).toLowerCase() !== filters.loanStatus) {
          return false;
        }
      }

      if (filters.repaymentStatus) {
        const loanReps = repayments.filter((r) => r.loanId === loan.id);
        const hasMatch =
          filters.repaymentStatus === "paid"
            ? loanReps.some((r) => r.status === "✅")
            : filters.repaymentStatus === "missed"
            ? loanReps.some((r) => r.status === "❌")
            : loanReps.some((r) => r.status !== "✅" && r.status !== "❌");
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [loans, filters, repayments, getLoanLifecycleStatus]);

  const filteredLoanIds = useMemo(
    () => new Set(filteredLoans.map((loan) => loan.id)),
    [filteredLoans]
  );

  const filteredRepayments = useMemo(
    () => repayments.filter((repayment) => filteredLoanIds.has(repayment.loanId)),
    [repayments, filteredLoanIds]
  );

  const generateRepaymentSchedule = (loanId, loanData) => {
    const tenor = Math.max(Number(loanData.tenor) || 1, 1);
    const principal = Number(loanData.amount);
    const ratePerTenorUnit = Number(loanData.interestRate || 0);
    const totalInterestRate = ratePerTenorUnit * tenor;
    const totalRepayable = principal + (principal * totalInterestRate) / 100;
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
      const resolvedInterestRate = loanTypeRateByName.get(newLoan.loanType);
      if (resolvedInterestRate == null) {
        alert("Please select a valid loan type.");
        setLoading(false);
        return;
      }

      const loanPayload = {
        customerName: newLoan.customerName,
        amount: Number(newLoan.amount),
        loanType: newLoan.loanType,
        interestRate: Number(resolvedInterestRate),
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
        loanType: "",
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

  const handleCopyAccountNumber = async (loan) => {
    const accountNumber = String(loan?.accountNumber || "").trim();
    if (!accountNumber) return;

    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedLoanId(loan.id);
      window.setTimeout(() => setCopiedLoanId(null), 1200);
    } catch (err) {
      console.error("Failed to copy account number:", err);
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
      const loanTypeChanged = (prevLoan.loanType || "") !== (editingLoan.loanType || "");

      const resolvedInterestRate = loanTypeRateByName.get(editingLoan.loanType);
      if (resolvedInterestRate == null) {
        alert("Please select a valid loan type.");
        setLoading(false);
        return;
      }

      // Update loan metadata first
      await syncUpdateLoan(editingLoan.id, {
        customerName: editingLoan.customerName,
        amount: Number(editingLoan.amount),
        loanType: editingLoan.loanType,
        interestRate: Number(resolvedInterestRate),
        tenor: Number(editingLoan.tenor),
        startDate: editingLoan.startDate,
        officer: editingLoan.officer,
        branch: editingLoan.branch,
      });

      if (amountChanged || tenorChanged || startDateChanged || loanTypeChanged) {
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
    loanStatus: "",
    repaymentStatus: "",
  });
};

const exportToCSV = () => {
  // Create array of loan records with repayment summaries
  const csvData = filteredLoans.map((loan) => {
    const loanReps = filteredRepayments.filter((r) => r.loanId === loan.id);
    const paidCount = loanReps.filter((r) => r.status === "✅").length;
    const pendingCount = loanReps.filter((r) => r.status !== "✅" && r.status !== "❌").length;
    const missedCount = loanReps.filter((r) => r.status === "❌").length;
    
    return {
      "Customer Name": loan.customerName || "",
      "Loan Amount": loan.amount || "",
      "Loan Type": loan.loanType || "",
      "Interest Rate (%)": loan.interestRate || "",
      "Tenor (Months)": loan.tenor || "",
      "Disbursement Date": loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "",
      "Account Officer": loan.officer || "",
      "Branch": loan.branch || "",
      "Loan Status": getLoanLifecycleStatus(loan),
      "Paid Installments": paidCount,
      "Pending Installments": pendingCount,
      "Missed Installments": missedCount,
      "Total Repayments": loanReps.length,
    };
  });

  if (csvData.length === 0) {
    alert("No loans to export based on current filters.");
    return;
  }

  // Create CSV headers
  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.join(","),
    ...csvData.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const valueStr = String(value);
          return valueStr.includes(",") ? `"${valueStr.replace(/"/g, '""')}"` : valueStr;
        })
        .join(",")
    ),
  ].join("\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `loans_export_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 0.75, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>
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
            <FormControl fullWidth required>
              <InputLabel>Loan Type</InputLabel>
              <Select
                value={newLoan.loanType}
                label="Loan Type"
                onChange={(e) => setNewLoan((s) => ({ ...s, loanType: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Select Loan Type</em>
                </MenuItem>
                {(loanTypes || []).map((loanType) => (
                  <MenuItem key={loanType.id || loanType.name} value={loanType.name}>
                    {loanType.name} ({loanType.interestRate}% )
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
              <InputLabel>Relationship Manager</InputLabel>
              <Select
                value={newLoan.officer}
                label="Relationship Manager"
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
              select
              label="Branch"
              value={newLoan.branch}
              onChange={(e) => setNewLoan((s) => ({ ...s, branch: e.target.value }))}
              required
              fullWidth
            >
              <MenuItem value="">
                <em>Select branch</em>
              </MenuItem>
              {branchOptions.map((branchName) => (
                <MenuItem key={branchName} value={branchName}>
                  {branchName}
                </MenuItem>
              ))}
            </TextField>
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

      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 0.75, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}>

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

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              select
              label="Loan Status"
              fullWidth
              value={filters.loanStatus}
              onChange={handleFilterChange("loanStatus")}
            >
              <MenuItem value="">All Loan Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <TextField
              select
              label="Repayment Status"
              fullWidth
              value={filters.repaymentStatus}
              onChange={handleFilterChange("repaymentStatus")}
            >
              <MenuItem value="">All Repayment Statuses</MenuItem>
              <MenuItem value="paid">Has Paid</MenuItem>
              <MenuItem value="pending">Has Pending</MenuItem>
              <MenuItem value="missed">Has Missed</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Button variant="outlined" onClick={resetFilters} sx={{ mr: 1 }}>
              Reset Filters
            </Button>
            <Button variant="contained" color="success" onClick={exportToCSV}>
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 0.75, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
              <TableCell>Repayment Amount</TableCell>
              <TableCell>Repayment Day</TableCell>
              <TableCell>Loan Status</TableCell>
              <TableCell>Repayment Status</TableCell>
              <TableCell>Account Officer</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
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
              const { paid, pending, missed } = getStatusCounts(loan.id);
              const monthlyInstallment = loanRepayments[0]?.amount || 0;
              const loanStatus = getLoanLifecycleStatus(loan);

              return (
                <TableRow key={loan.id}>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Box
                          component="sup"
                          sx={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            lineHeight: 1,
                            bgcolor: "rgba(30,58,138,0.10)",
                            color: "#1e3a8a",
                            borderRadius: "999px",
                            px: 0.6,
                            py: 0.15,
                            alignSelf: "flex-start",
                            transform: "translateY(-0.35em)",
                          }}
                        >
                          {getLoanCycle(loanCycleMap, loan)}
                        </Box>
                        <span>{loan.customerName}</span>
                      </Box>
                      <Box
                        sx={{
                          mt: 0.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "#64748b",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span>Acct: {loan.accountNumber || "-"}</span>
                        {loan.accountNumber ? (
                          <Tooltip title={copiedLoanId === loan.id ? "Copied" : "Copy"}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopyAccountNumber(loan)}
                              aria-label={`Copy account number for ${loan.customerName || "customer"}`}
                              sx={{ p: 0.35 }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>₦{monthlyInstallment?.toLocaleString() || "0"}</TableCell>
                  <TableCell>{repaymentDay}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={loanStatus}
                      sx={{
                        fontWeight: 700,
                        bgcolor:
                          loanStatus === "Closed"
                            ? "#dcfce7"
                            : loanStatus === "Overdue"
                            ? "#fee2e2"
                            : "#dbeafe",
                        color:
                          loanStatus === "Closed"
                            ? "#166534"
                            : loanStatus === "Overdue"
                            ? "#991b1b"
                            : "#1e3a8a",
                      }}
                    />
                  </TableCell>
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
              <FormControl fullWidth margin="normal">
                <InputLabel>Loan Type</InputLabel>
                <Select
                  value={editingLoan?.loanType || ""}
                  label="Loan Type"
                  onChange={(e) => setEditingLoan((s) => ({ ...s, loanType: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Select Loan Type</em>
                  </MenuItem>
                  {(loanTypes || []).map((loanType) => (
                    <MenuItem key={loanType.id || loanType.name} value={loanType.name}>
                      {loanType.name} ({loanType.interestRate}% )
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                select
                label="Branch"
                value={editingLoan?.branch || ""}
                onChange={(e) => setEditingLoan((s) => ({ ...s, branch: e.target.value }))}
                fullWidth
                margin="normal"
              >
                <MenuItem value="">
                  <em>Select branch</em>
                </MenuItem>
                {branchOptions.map((branchName) => (
                  <MenuItem key={branchName} value={branchName}>
                    {branchName}
                  </MenuItem>
                ))}
              </TextField>
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