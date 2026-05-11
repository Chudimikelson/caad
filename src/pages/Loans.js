import React, { useContext, useMemo, useState, useCallback } from "react";
import { DataContext } from "../DataContext";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { buildLoanCycleMap, getLoanCycle } from "../utils/loanCycle";
import LoanCard from "../components/LoanCard";

const fmtCurrency = (val) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(Number(val || 0));

const normalizeManagerName = (value) =>
  String(value || "").trim().replace(/\s*\(Officer\)$/i, "").trim();

const addMonthsPreservingDay = (baseDate, monthsToAdd) => {
  const source = new Date(baseDate);
  const target = new Date(source);
  const originalDay = source.getDate();

  target.setDate(1);
  target.setMonth(target.getMonth() + monthsToAdd);

  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return target;
};

const Loans = () => {
  const { loans, repayments, user } = useContext(DataContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isRelationshipManager = user?.role === "Relationship Manager";
  const managerNames = useMemo(() => {
    if (!isRelationshipManager) return "";
    return normalizeManagerName(user?.name || user?.accountOfficer?.name);
  }, [isRelationshipManager, user]);

  const scopedLoans = useMemo(() => {
    if (!isRelationshipManager) return loans;
    if (!managerNames) return [];

    return loans.filter((loan) => normalizeManagerName(loan.officer) === managerNames);
  }, [isRelationshipManager, loans, managerNames]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    relationshipManager: "",
    branch: "",
    status: "",
    customerSearch: "",
  });
  const loanCycleMap = buildLoanCycleMap(scopedLoans);

  const relationshipManagers = useMemo(
    () =>
      Array.from(
        new Set(
          scopedLoans
            .map((loan) => (typeof loan.officer === "string" ? loan.officer.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [scopedLoans]
  );

  const branches = useMemo(
    () =>
      Array.from(
        new Set(
          scopedLoans
            .map((loan) => (typeof loan.branch === "string" ? loan.branch.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [scopedLoans]
  );

  const repaymentCountByLoan = useMemo(() => {
    const map = new Map();
    repayments.forEach((repayment) => {
      if (repayment.status !== "✅") return;
      const key = String(repayment.loanId || "");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [repayments]);

  const getLoanLifecycleStatus = useCallback((loan) => {
    const tenor = Math.max(Number(loan.tenor) || 0, 0);
    const paidCount = repaymentCountByLoan.get(String(loan.id || "")) || 0;

    if (tenor > 0 && paidCount >= tenor) return "closed";
    if (!loan.startDate || tenor <= 0) return "active";

    const maturityDate = addMonthsPreservingDay(loan.startDate, tenor);
    return new Date() >= maturityDate ? "overdue" : "active";
  }, [repaymentCountByLoan]);

  const filteredLoans = useMemo(() => {
    return scopedLoans.filter((loan) => {
      const disbursementDate = loan.startDate ? new Date(loan.startDate) : null;
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && disbursementDate && disbursementDate < startDate) return false;

      if (endDate && disbursementDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (disbursementDate > endOfDay) return false;
      }

      if (filters.relationshipManager && (loan.officer || "") !== filters.relationshipManager) return false;
      if (filters.branch && (loan.branch || "") !== filters.branch) return false;
      if (filters.status && getLoanLifecycleStatus(loan) !== filters.status) return false;

      if (filters.customerSearch) {
        const customerName = (loan.customerName || "").toLowerCase();
        if (!customerName.includes(filters.customerSearch.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [scopedLoans, filters, getLoanLifecycleStatus]);

  const lifecycleTotals = useMemo(() => {
    let activeCount = 0;
    let closedCount = 0;
    let overdueCount = 0;
    let activeAmount = 0;
    let closedAmount = 0;
    let overdueAmount = 0;

    const activeClients = new Set();
    const closedClients = new Set();
    const overdueClients = new Set();

    filteredLoans.forEach((loan) => {
      const tenor = Math.max(Number(loan.tenor) || 0, 0);
      const paidCount = repaymentCountByLoan.get(String(loan.id || "")) || 0;
      const amount = Number(loan.amount || 0);
      const customer = String(loan.customerName || "").trim();

      if (tenor > 0 && paidCount >= tenor) {
        closedCount += 1;
        closedAmount += amount;
        if (customer) closedClients.add(customer.toLowerCase());
        return;
      }

      if (!loan.startDate || tenor <= 0) {
        activeCount += 1;
        activeAmount += amount;
        if (customer) activeClients.add(customer.toLowerCase());
        return;
      }

      const maturityDate = addMonthsPreservingDay(loan.startDate, tenor);
      if (new Date() >= maturityDate) {
        overdueCount += 1;
        overdueAmount += amount;
        if (customer) overdueClients.add(customer.toLowerCase());
      } else {
        activeCount += 1;
        activeAmount += amount;
        if (customer) activeClients.add(customer.toLowerCase());
      }
    });

    const totalClients = new Set(
      filteredLoans
        .map((loan) => String(loan.customerName || "").trim().toLowerCase())
        .filter(Boolean)
    ).size;

    return {
      totalAmount: filteredLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
      totalClients,
      activeCount,
      activeAmount,
      activeClients: activeClients.size,
      closedCount,
      closedAmount,
      closedClients: closedClients.size,
      overdueCount,
      overdueAmount,
      overdueClients: overdueClients.size,
    };
  }, [filteredLoans, repaymentCountByLoan]);

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      relationshipManager: "",
      branch: "",
      status: "",
      customerSearch: "",
    });
  };

  const handleCustomerClick = (customerName) => {
    const name = String(customerName || "").trim();
    if (!name) return;
    navigate(`/customers/${encodeURIComponent(name)}`);
  };

  const exportToCSV = () => {
    // Create array of loan records
    const csvData = filteredLoans.map((loan) => {
      const loanReps = loans.filter((l) => l.id === loan.id)
        .flatMap((l) => repayments.filter((r) => r.loanId === l.id));
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

  const summaryCards = [
    {
      title: "Total Loans",
      value: fmtCurrency(lifecycleTotals.totalAmount),
      subtitle: `${lifecycleTotals.totalClients} clients`,
      icon: <AccountBalanceWalletRoundedIcon />,
      accent: "#2563eb",
      tint: "#eff6ff",
    },
    {
      title: "Total Active",
      value: fmtCurrency(lifecycleTotals.activeAmount),
      subtitle: `${lifecycleTotals.activeClients} clients`,
      icon: <PendingActionsRoundedIcon />,
      accent: "#d97706",
      tint: "#fff7ed",
    },
    {
      title: "Total Closed",
      value: fmtCurrency(lifecycleTotals.closedAmount),
      subtitle: `${lifecycleTotals.closedClients} clients`,
      icon: <TaskAltRoundedIcon />,
      accent: "#16a34a",
      tint: "#ecfdf5",
    },
    {
      title: "Total Overdue",
      value: fmtCurrency(lifecycleTotals.overdueAmount),
      subtitle: `${lifecycleTotals.overdueClients} clients`,
      icon: <WarningAmberRoundedIcon />,
      accent: "#dc2626",
      tint: "#fef2f2",
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {summaryCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 4 }}>
            <Paper
              sx={{
                p: 2.25,
                borderRadius: 0.75,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 0.6, fontWeight: 600 }}>
                  {card.title}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: "#0f172a", fontWeight: 800, mb: 0.45, lineHeight: 1.15 }}
                >
                  {card.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", lineHeight: 1.5 }}>
                  {card.subtitle}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: 3,
                  bgcolor: card.tint,
                  color: card.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `inset 0 0 0 1px ${card.accent}22`,
                }}
              >
                {card.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 0.75,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={handleFilterChange("startDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={handleFilterChange("endDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {!isRelationshipManager && (
            <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
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
          )}

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
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

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              select
              label="Loan Status"
              fullWidth
              value={filters.status}
              onChange={handleFilterChange("status")}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <TextField
              label="Search Customer"
              placeholder="Search by customer name"
              fullWidth
              value={filters.customerSearch}
              onChange={handleFilterChange("customerSearch")}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Button variant="outlined" onClick={resetFilters} sx={{ minHeight: 56, width: "100%", mr: 1 }}>
              Reset Filters
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Button variant="contained" color="success" onClick={exportToCSV} sx={{ minHeight: 56, width: "100%" }}>
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Loans Table/Cards */}
      {isMobile ? (
        // Mobile Card View
        <Box>
          {filteredLoans.length === 0 ? (
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                borderRadius: 0.75,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
              }}
            >
              <Typography sx={{ color: "#64748b" }}>
                No loans match the selected filters.
              </Typography>
            </Paper>
          ) : (
            filteredLoans.map((loan, idx) => (
              <LoanCard
                key={loan.id || idx}
                loan={loan}
                loanCycle={getLoanCycle(loanCycleMap, loan)}
                formatCurrency={fmtCurrency}
                getLoanLifecycleStatus={getLoanLifecycleStatus}
                onCustomerClick={handleCustomerClick}
              />
            ))
          )}
        </Box>
      ) : (
        // Desktop Table View
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 0.75, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(59,130,246,0.08)", borderBottom: "2px solid rgba(59,130,246,0.16)" }}>
                {["Customer Name", "Loan Amount", "Interest Rate (%)", "Tenor (months)", "Start Date", "Account Officer", "Branch"].map(
                  (col) => (
                    <TableCell
                      key={col}
                      sx={{
                        bgcolor: "rgba(59,130,246,0.08)",
                        fontWeight: 700,
                        color: "#1e3a8a",
                        fontSize: "0.875rem",
                        borderBottom: "2px solid rgba(59,130,246,0.16)",
                      }}
                    >
                      {col}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                    No loans match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((loan, idx) => (
                  <TableRow
                    key={loan.id || idx}
                    sx={{
                      bgcolor: idx % 2 === 0 ? "rgba(59,130,246,0.04)" : "transparent",
                      "&:hover": { bgcolor: "rgba(59,130,246,0.10)", transition: "background-color 0.2s ease" },
                    }}
                  >
                    <TableCell>
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
                        <Box
                          component="button"
                          type="button"
                          onClick={() => handleCustomerClick(loan.customerName)}
                          sx={{
                            border: "none",
                            p: 0,
                            bgcolor: "transparent",
                            color: "inherit",
                            textDecoration: "none",
                            cursor: "pointer",
                            font: "inherit",
                          }}
                        >
                          {loan.customerName}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{fmtCurrency(loan.amount)}</TableCell>
                    <TableCell>{loan.interestRate}</TableCell>
                    <TableCell>{loan.tenor}</TableCell>
                    <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{loan.officer || "-"}</TableCell>
                    <TableCell>{loan.branch || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Loans;