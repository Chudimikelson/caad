import React, { useContext, useMemo, useState } from "react";
import { DataContext } from "../DataContext";
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
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CancelIcon from "@mui/icons-material/Cancel";
import { buildLoanCycleMap, getLoanCycle } from "../utils/loanCycle";
import RepaymentCard from "../components/RepaymentCard";

const MyReports = () => {
  const { user, loans, repayments } = useContext(DataContext);
  const loanCycleMap = useMemo(() => buildLoanCycleMap(loans), [loans]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    repaymentView: "all",
    customerSearch: "",
  });
  
  const rmIdentifiers = useMemo(
    () =>
      [user?.name, user?.email]
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean),
    [user]
  );

  const myLoans = useMemo(
    () =>
      loans.filter((loan) => {
        const officer = typeof loan.officer === "string" ? loan.officer.trim().toLowerCase() : "";
        return officer && rmIdentifiers.includes(officer);
      }),
    [loans, rmIdentifiers]
  );

  const myLoanIds = useMemo(() => new Set(myLoans.map((loan) => loan.id)), [myLoans]);

  const myRepayments = useMemo(
    () => repayments.filter((repayment) => myLoanIds.has(repayment.loanId)),
    [repayments, myLoanIds]
  );

  const filteredTableRepayments = useMemo(() => {
    return myRepayments.filter((repayment) => {
      const repaymentDate = repayment.date ? new Date(repayment.date) : null;
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && repaymentDate && repaymentDate < startDate) {
        return false;
      }

      if (endDate && repaymentDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (repaymentDate > endOfDay) {
          return false;
        }
      }

      if (filters.repaymentView === "missed" && repayment.status !== "❌") {
        return false;
      }

      return true;
    });
  }, [myRepayments, filters]);

  const filteredLoanIds = useMemo(
    () => new Set(filteredTableRepayments.map((repayment) => repayment.loanId)),
    [filteredTableRepayments]
  );

  const filteredTableLoans = useMemo(
    () =>
      myLoans.filter((loan) => {
        if (!filteredLoanIds.has(loan.id)) {
          return false;
        }

        if (filters.customerSearch) {
          const customerName = (loan.customerName || "").toLowerCase();
          if (!customerName.includes(filters.customerSearch.trim().toLowerCase())) {
            return false;
          }
        }

        return true;
      }),
    [myLoans, filteredLoanIds, filters.customerSearch]
  );

  // Summary calculations
  const totalLoans = myLoans.length;
  const totalLoanAmount = myLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const runningLoanRecords = myLoans.filter((loan) => {
    const paidCount = myRepayments.filter((repayment) => repayment.loanId === loan.id && repayment.status === "✅").length;
    return paidCount < loan.tenor;
  });
  const runningLoans = runningLoanRecords.length;
  const runningLoanAmount = runningLoanRecords.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const totalExpected = myRepayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const expectedRepaymentCount = myRepayments.length;
  const missedRepaymentCount = myRepayments.filter((repayment) => repayment.status === "❌").length;
  const totalMissed = myRepayments
    .filter((repayment) => repayment.status === "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

  // Helper for repayment day
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

  const formatNaira = (value) => `₦${Number(value || 0).toLocaleString()}`;

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      repaymentView: "all",
      customerSearch: "",
    });
  };

  const summaryCards = [
    {
      title: "Total Loans",
      amount: formatNaira(totalLoanAmount),
      count: `${totalLoans} loans`,
      icon: <AttachMoneyIcon />,
      accent: "#f59e0b",
      tint: "#fffbeb",
    },
    {
      title: "Running Loans",
      amount: formatNaira(runningLoanAmount),
      count: `${runningLoans} loans`,
      icon: <TrendingUpIcon />,
      accent: "#1e3a8a",
      tint: "#e0e7ff",
    },
    {
      title: "Expected Repayments",
      amount: formatNaira(totalExpected),
      count: `${expectedRepaymentCount} repayments`,
      icon: <AssessmentIcon />,
      accent: "#0ea5e9",
      tint: "#e0f2fe",
    },
    {
      title: "Missed Repayments",
      amount: formatNaira(totalMissed),
      count: `${missedRepaymentCount} repayments`,
      icon: <CancelIcon />,
      accent: "#dc2626",
      tint: "#fef2f2",
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {summaryCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 6 }}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 0.75,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                minHeight: 118,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 0.6, fontWeight: 600 }}>
                  {card.title}
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ lineHeight: 1.15, mb: 0.25, fontSize: { xs: "1.05rem", md: "1.15rem" } }}
                >
                  {card.amount}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", lineHeight: 1.5 }}>
                  {card.count}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  bgcolor: card.tint,
                  color: card.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `inset 0 0 0 1px ${card.accent}22`,
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Repayments Table */}
      <Paper
        sx={{
          borderRadius: 0.75,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          p: 2.5,
          mt: 0,
        }}
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="Repayment From"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={handleFilterChange("startDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="Repayment To"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={handleFilterChange("endDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              select
              label="Repayment Filter"
              fullWidth
              value={filters.repaymentView}
              onChange={handleFilterChange("repaymentView")}
            >
              <MenuItem value="all">All Repayments</MenuItem>
              <MenuItem value="missed">Missed Repayments</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
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

        {isMobile ? (
          <Box>
            {filteredTableRepayments.length === 0 ? (
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
                  No repayments match the selected filters.
                </Typography>
              </Paper>
            ) : (
              filteredTableRepayments.map((repayment, idx) => {
                const loan = loans.find((l) => l.id === repayment.loanId);
                return (
                  <RepaymentCard
                    key={repayment.id || idx}
                    repayment={repayment}
                    loan={loan}
                    formatCurrency={formatNaira}
                  />
                );
              })
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(59,130,246,0.08)", borderBottom: "2px solid rgba(59,130,246,0.16)" }}>
                  {["Customer Name", "Expected Repayment Amount", "Day of Repayment", "Branch", "Repayment Status"].map(
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
                {filteredTableLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                      No repayments match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTableLoans.map((loan, idx) => {
                    const loanRepayments = filteredTableRepayments.filter((r) => r.loanId === loan.id);
                    const repaymentDay = getOrdinalDay(loan.startDate);
                    const installmentAmount = loanRepayments[0]?.amount || 0;
                    return (
                      <TableRow
                        key={loan.id}
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
                            <span>{loan.customerName}</span>
                          </Box>
                        </TableCell>
                        <TableCell>{formatNaira(installmentAmount)}</TableCell>
                        <TableCell>{repaymentDay}</TableCell>
                        <TableCell>{loan.branch || "-"}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.8, flexWrap: "wrap" }}>
                            {loanRepayments.length === 0 ? (
                              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                -
                              </Typography>
                            ) : (
                              loanRepayments.map((r) => (
                                <Box
                                  key={r.id}
                                  component="span"
                                  sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 2,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.85rem",
                                    bgcolor:
                                      r.status === "✅"
                                        ? "rgba(34,197,94,0.16)"
                                        : r.status === "❌"
                                        ? "rgba(239,68,68,0.16)"
                                        : "rgba(100,116,139,0.12)",
                                    color:
                                      r.status === "✅"
                                        ? "#15803d"
                                        : r.status === "❌"
                                        ? "#b91c1c"
                                        : "#64748b",
                                  }}
                                >
                                  {r.status || "○"}
                                </Box>
                              ))
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default MyReports;
