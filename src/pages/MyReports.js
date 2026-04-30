import React, { useContext, useMemo, useState } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
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
  Avatar,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CancelIcon from "@mui/icons-material/Cancel";

const MyReports = () => {
  const { user, loans, repayments } = useContext(DataContext);
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
      avatarColor: "#fbbf24",
      labelColor: "#b45309",
      background: "linear-gradient(135deg, #fbbf24 0%, #fffbe6 100%)",
    },
    {
      title: "Running Loans",
      amount: formatNaira(runningLoanAmount),
      count: `${runningLoans} loans`,
      icon: <TrendingUpIcon />,
      avatarColor: "#1e3a8a",
      labelColor: "#1e3a8a",
      background: "linear-gradient(135deg, #1e3a8a 0%, #e0e7ff 100%)",
    },
    {
      title: "Expected Repayments",
      amount: formatNaira(totalExpected),
      count: `${expectedRepaymentCount} repayments`,
      icon: <AssessmentIcon />,
      avatarColor: "#fbbf24",
      labelColor: "#b45309",
      background: "linear-gradient(135deg, #fbbf24 0%, #fffbe6 100%)",
    },
    {
      title: "Missed Repayments",
      amount: formatNaira(totalMissed),
      count: `${missedRepaymentCount} repayments`,
      icon: <CancelIcon />,
      avatarColor: "#f87171",
      labelColor: "#b91c1c",
      background: "linear-gradient(135deg, #f87171 0%, #fee2e2 100%)",
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Summary Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2,
          width: "100%",
        }}
      >
        {summaryCards.map((card) => (
          <Paper
            key={card.title}
            sx={{
              p: 1.75,
              borderRadius: 0.5,
              boxShadow: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              background: card.background,
              minWidth: 0,
            }}
          >
            <Avatar
              sx={{
                bgcolor: card.avatarColor,
                color: "#fff",
                width: 40,
                height: 40,
              }}
            >
              {card.icon}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color={card.labelColor} sx={{ fontWeight: 700, display: "block" }}>
                {card.title}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ lineHeight: 1.15, mb: 0.2, fontSize: { xs: "1.05rem", md: "1.15rem" } }}
              >
                {card.amount}
              </Typography>
              <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600, fontSize: "0.7rem" }}>
                {card.count}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Repayments Table */}
      <Paper sx={{ borderRadius: 0.5, boxShadow: 2, p: 2, mt: 0 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color="#1e3a8a">
          Customer Repayments
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            label="Repayment From"
            type="date"
            fullWidth
            value={filters.startDate}
            onChange={handleFilterChange("startDate")}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Repayment To"
            type="date"
            fullWidth
            value={filters.endDate}
            onChange={handleFilterChange("endDate")}
            InputLabelProps={{ shrink: true }}
          />

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

          <TextField
            label="Search Customer"
            placeholder="Search by customer name"
            fullWidth
            value={filters.customerSearch}
            onChange={handleFilterChange("customerSearch")}
          />

          <Button variant="outlined" onClick={resetFilters} sx={{ minHeight: 56 }}>
            Reset Filters
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Expected Repayment Amount</TableCell>
                <TableCell>Day of Repayment</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Repayment Status</TableCell>
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
                filteredTableLoans.map((loan) => {
                const loanRepayments = filteredTableRepayments.filter((r) => r.loanId === loan.id);
                const repaymentDay = getOrdinalDay(loan.startDate);
                const installmentAmount = loanRepayments[0]?.amount || 0;
                return (
                  <TableRow key={loan.id}>
                    <TableCell>{loan.customerName}</TableCell>
                    <TableCell>{formatNaira(installmentAmount)}</TableCell>
                    <TableCell>{repaymentDay}</TableCell>
                    <TableCell>{loan.branch || "-"}</TableCell>
                    <TableCell>
                      {loanRepayments.map((r) => (
                        <span
                          key={r.id}
                          style={{
                            marginRight: "8px",
                            fontSize: "20px",
                            color:
                              r.status === "✅"
                                ? "#22c55e"
                                : r.status === "❌"
                                ? "#ef4444"
                                : "#64748b",
                          }}
                        >
                          {r.status || "⚪"}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                );
              }))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default MyReports;
