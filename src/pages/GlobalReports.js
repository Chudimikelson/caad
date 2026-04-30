import React, { useContext, useMemo, useState } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CancelIcon from "@mui/icons-material/Cancel";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { buildLoanCycleMap, getLoanCycle } from "../utils/loanCycle";

const formatNaira = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatMillions = (value) => {
  const numericValue = Number(value || 0);
  if (!numericValue) return "0M";
  return `${(numericValue / 1000000).toFixed(numericValue >= 10000000 ? 0 : 1)}M`;
};

const escapeCsvValue = (value) => {
  if (value == null) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const getOrdinalDay = (date) => {
  if (!date) return "-";

  const day = new Date(date).getDate();
  const j = day % 10;
  const k = day % 100;

  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;

  return `${day}th`;
};

const getRepaymentState = (status) => {
  if (status === "✅") return "paid";
  if (status === "❌") return "missed";
  return "pending";
};

const GlobalReports = () => {
  const { loans, repayments } = useContext(DataContext);
  const loanCycleMap = useMemo(() => buildLoanCycleMap(loans), [loans]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    relationshipManager: "",
    branch: "",
    status: "",
    customerSearch: "",
  });

  const relationshipManagers = useMemo(
    () =>
      Array.from(
        new Set(
          loans
            .map((loan) => (typeof loan.officer === "string" ? loan.officer.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [loans]
  );

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

  const filteredRepayments = useMemo(() => {
    return repayments.filter((repayment) => {
      const repaymentLoan = loans.find((loan) => loan.id === repayment.loanId);
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

      if (filters.relationshipManager) {
        const manager = repayment.officer || repaymentLoan?.officer || "";
        if (manager !== filters.relationshipManager) {
          return false;
        }
      }

      if (filters.branch) {
        const branch = repayment.branch || repaymentLoan?.branch || "";
        if (branch !== filters.branch) {
          return false;
        }
      }

      if (filters.status && getRepaymentState(repayment.status) !== filters.status) {
        return false;
      }

      if (filters.customerSearch) {
        const customerName = (repaymentLoan?.customerName || "").toLowerCase();
        if (!customerName.includes(filters.customerSearch.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [repayments, loans, filters]);

  const filteredLoanIds = useMemo(
    () => new Set(filteredRepayments.map((repayment) => repayment.loanId)),
    [filteredRepayments]
  );

  const filteredLoans = useMemo(
    () => loans.filter((loan) => filteredLoanIds.has(loan.id)),
    [loans, filteredLoanIds]
  );

  const reportRows = useMemo(
    () =>
      filteredLoans.map((loan) => {
        const loanRepayments = filteredRepayments
          .filter((repayment) => repayment.loanId === loan.id)
          .sort((left, right) => new Date(left.date) - new Date(right.date));

        const paidForLoan = loanRepayments.filter((repayment) => repayment.status === "✅").length;
        const pendingForLoan = loanRepayments.filter(
          (repayment) => repayment.status !== "✅" && repayment.status !== "❌"
        ).length;
        const missedForLoan = loanRepayments.filter((repayment) => repayment.status === "❌").length;

        return {
          id: loan.id,
          customerName: loan.customerName,
          officer: loan.officer || "-",
          branch: loan.branch || "-",
          amount: Number(loan.amount || 0),
          installmentAmount: Number(loanRepayments[0]?.amount || 0),
          repaymentDay: getOrdinalDay(loan.startDate),
          paidForLoan,
          pendingForLoan,
          missedForLoan,
        };
      }),
    [filteredLoans, filteredRepayments]
  );

  const totalDisbursed = filteredLoans.reduce(
    (sum, loan) => sum + Number(loan.amount || 0),
    0
  );
  const runningLoanAmount = filteredLoans.reduce((sum, loan) => {
    const paidForLoan = filteredRepayments.filter(
      (repayment) => repayment.loanId === loan.id && repayment.status === "✅"
    ).length;

    return paidForLoan < Number(loan.tenor || 0) ? sum + Number(loan.amount || 0) : sum;
  }, 0);
  const totalExpected = filteredRepayments.reduce(
    (sum, repayment) => sum + Number(repayment.amount || 0),
    0
  );
  const totalMissed = filteredRepayments
    .filter((repayment) => repayment.status === "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const paidCount = filteredRepayments.filter((repayment) => repayment.status === "✅").length;
  const pendingCount = filteredRepayments.filter(
    (repayment) => repayment.status !== "✅" && repayment.status !== "❌"
  ).length;
  const missedCount = filteredRepayments.filter((repayment) => repayment.status === "❌").length;

  const paidAmount = filteredRepayments
    .filter((repayment) => repayment.status === "✅")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const pendingAmount = filteredRepayments
    .filter((repayment) => repayment.status !== "✅" && repayment.status !== "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const missedAmount = filteredRepayments
    .filter((repayment) => repayment.status === "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

  const branchRollups = useMemo(() => {
    const map = new Map();

    reportRows.forEach((row) => {
      const key = row.branch || "Unassigned";
      if (!map.has(key)) {
        map.set(key, {
          branch: key,
          loans: 0,
          disbursed: 0,
          paid: 0,
          pending: 0,
          missed: 0,
        });
      }

      const current = map.get(key);
      current.loans += 1;
      current.disbursed += row.amount;
      current.paid += row.paidForLoan;
      current.pending += row.pendingForLoan;
      current.missed += row.missedForLoan;
    });

    return Array.from(map.values()).sort((left, right) => right.disbursed - left.disbursed);
  }, [reportRows]);

  const officerRollups = useMemo(() => {
    const map = new Map();

    reportRows.forEach((row) => {
      const key = row.officer || "Unassigned";
      if (!map.has(key)) {
        map.set(key, {
          officer: key,
          loans: 0,
          disbursed: 0,
          paid: 0,
          pending: 0,
          missed: 0,
        });
      }

      const current = map.get(key);
      current.loans += 1;
      current.disbursed += row.amount;
      current.paid += row.paidForLoan;
      current.pending += row.pendingForLoan;
      current.missed += row.missedForLoan;
    });

    return Array.from(map.values()).sort((left, right) => right.disbursed - left.disbursed);
  }, [reportRows]);

  const monthlyTrendData = useMemo(() => {
    const map = new Map();

    filteredRepayments.forEach((repayment) => {
      if (!repayment.date) return;
      const monthKey = String(repayment.date).slice(0, 7);
      if (!map.has(monthKey)) {
        map.set(monthKey, { month: monthKey, paid: 0, pending: 0, missed: 0 });
      }

      const current = map.get(monthKey);
      if (repayment.status === "✅") current.paid += Number(repayment.amount || 0);
      else if (repayment.status === "❌") current.missed += Number(repayment.amount || 0);
      else current.pending += Number(repayment.amount || 0);
    });

    return Array.from(map.values()).sort((left, right) => left.month.localeCompare(right.month));
  }, [filteredRepayments]);

  const statusBreakdownData = [
    { name: "Paid", value: paidCount, color: "#16a34a" },
    { name: "Pending", value: pendingCount, color: "#d97706" },
    { name: "Missed", value: missedCount, color: "#dc2626" },
  ];
  const totalStatusCount = paidCount + pendingCount + missedCount;
  const statusPieData = statusBreakdownData.map((item) => ({
    ...item,
    percentage: totalStatusCount ? (item.value / totalStatusCount) * 100 : 0,
  }));

  const statusAmountData = [
    { name: "Paid", value: paidAmount, color: "#16a34a" },
    { name: "Pending", value: pendingAmount, color: "#d97706" },
    { name: "Missed", value: missedAmount, color: "#dc2626" },
  ];

  const summaryCards = [
    {
      title: "Disbursed Portfolio",
      value: formatNaira(totalDisbursed),
      caption: `${filteredLoans.length} loans in report`,
      icon: <AttachMoneyIcon />,
      avatarColor: "#f59e0b",
      background: "linear-gradient(135deg, #fbbf24 0%, #fff7d6 100%)",
      textColor: "#92400e",
    },
    {
      title: "Running Exposure",
      value: formatNaira(runningLoanAmount),
      caption: `${filteredLoans.length} tracked accounts`,
      icon: <TrendingUpIcon />,
      avatarColor: "#1e3a8a",
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      textColor: "#1e3a8a",
    },
    {
      title: "Expected Repayments",
      value: formatNaira(totalExpected),
      caption: `${filteredRepayments.length} installments`,
      icon: <AssessmentIcon />,
      avatarColor: "#0f766e",
      background: "linear-gradient(135deg, #ccfbf1 0%, #f0fdfa 100%)",
      textColor: "#115e59",
    },
    {
      title: "Missed Collections",
      value: formatNaira(totalMissed),
      caption: `${missedCount} missed repayments`,
      icon: <CancelIcon />,
      avatarColor: "#dc2626",
      background: "linear-gradient(135deg, #fee2e2 0%, #fff5f5 100%)",
      textColor: "#991b1b",
    },
  ];

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

  const exportFilteredReport = () => {
    const headers = [
      "Customer Name",
      "Account Officer",
      "Branch",
      "Loan Amount",
      "Scheduled Installment",
      "Repayment Day",
      "Paid Count",
      "Pending Count",
      "Missed Count",
    ];

    const rows = reportRows.map((row) => [
      row.customerName,
      row.officer,
      row.branch,
      row.amount,
      row.installmentAmount,
      row.repaymentDay,
      row.paidForLoan,
      row.pendingForLoan,
      row.missedForLoan,
    ]);

    const csvText = [headers, ...rows]
      .map((line) => line.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    link.href = URL.createObjectURL(blob);
    link.download = `supervisor-report-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {summaryCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 3 }}>
            <Paper
              sx={{
                p: 2.25,
                borderRadius: 0.5,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                background: card.background,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: card.avatarColor,
                  color: "#fff",
                  width: 44,
                  height: 44,
                }}
              >
                {card.icon}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: card.textColor, fontWeight: 700 }}>
                  {card.title}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.15 }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#475569", fontWeight: 600 }}>
                  {card.caption}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 0.5,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Grid container spacing={2}>
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
              label="Repayment Status"
              fullWidth
              value={filters.status}
              onChange={handleFilterChange("status")}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="missed">Missed</MenuItem>
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

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={resetFilters} sx={{ minHeight: 56, flex: 1 }}>
                Reset Filters
              </Button>
              <Button variant="contained" onClick={exportFilteredReport} sx={{ minHeight: 56, flex: 1 }}>
                Export CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 0.5,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e2e8f0",
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={2} color="#1e3a8a">
              Repayment Trend by Month
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.12)" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickFormatter={formatMillions} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => formatNaira(value)}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "6px",
                    color: "#f8fbff",
                  }}
                  labelStyle={{ color: "#a3aed0" }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: "16px" }}
                  iconType="square"
                  formatter={(value) => <span style={{ color: "#475569", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
                />
                <Bar dataKey="paid" fill="#16a34a" name="Paid Amount" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" fill="#d97706" name="Pending Amount" radius={[8, 8, 0, 0]} />
                <Bar dataKey="missed" fill="#dc2626" name="Missed Amount" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 0.5,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e2e8f0",
              height: "100%",
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={2} color="#1e3a8a">
              Repayment Status Distribution
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 1.5, fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  By Count (%)
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={74}
                      innerRadius={40}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, context) => {
                        const percent = context?.payload?.percentage ?? 0;
                        return [`${value} (${percent.toFixed(1)}%)`, name];
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: "6px",
                        color: "#f8fbff",
                      }}
                      labelStyle={{ color: "#a3aed0" }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "12px" }}
                      formatter={(value) => <span style={{ color: "#475569", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 1.5, fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  By Amount
                </Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusAmountData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={74}
                      innerRadius={40}
                      label={({ value }) => `${formatMillions(value)}`}
                      labelLine={false}
                    >
                      {statusAmountData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [formatNaira(value), name]}
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: "6px",
                        color: "#f8fbff",
                      }}
                      labelStyle={{ color: "#a3aed0" }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "12px" }}
                      formatter={(value) => <span style={{ color: "#475569", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper
            sx={{
              borderRadius: 0.5,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e2e8f0",
              p: 2,
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={1.5} color="#1e3a8a">
              Branch Rollup
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(59, 130, 246, 0.08)", borderBottom: "2px solid rgba(59, 130, 246, 0.16)" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Branch</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Loans</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Disbursed</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>P/P/M</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branchRollups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: "#64748b", py: 3 }}>
                      No branch data for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  branchRollups.slice(0, 6).map((item, idx) => (
                    <TableRow
                      key={item.branch}
                      sx={{
                        bgcolor: idx % 2 === 0 ? "rgba(59, 130, 246, 0.04)" : "transparent",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        "&:hover": { bgcolor: "rgba(59, 130, 246, 0.10)" },
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>{item.branch}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{item.loans}</TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{formatNaira(item.disbursed)}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{`${item.paid}/${item.pending}/${item.missed}`}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 6 }}>
          <Paper
            sx={{
              borderRadius: 0.5,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              border: "1px solid #e2e8f0",
              p: 2,
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={1.5} color="#1e3a8a">
              Officer Totals
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "rgba(59, 130, 246, 0.08)", borderBottom: "2px solid rgba(59, 130, 246, 0.16)" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Officer</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Loans</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Disbursed</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>P/P/M</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {officerRollups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: "#64748b", py: 3 }}>
                      No officer data for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  officerRollups.slice(0, 6).map((item, idx) => (
                    <TableRow
                      key={item.officer}
                      sx={{
                        bgcolor: idx % 2 === 0 ? "rgba(59, 130, 246, 0.04)" : "transparent",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        "&:hover": { bgcolor: "rgba(59, 130, 246, 0.10)" },
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>{item.officer}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{item.loans}</TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{formatNaira(item.disbursed)}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{`${item.paid}/${item.pending}/${item.missed}`}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Chip label={`Paid: ${paidCount}`} sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 700 }} />
        <Chip label={`Pending: ${pendingCount}`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
        <Chip label={`Missed: ${missedCount}`} sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700 }} />
        <Chip
          icon={<AccountTreeIcon />}
          label={`Branches: ${new Set(filteredLoans.map((loan) => loan.branch).filter(Boolean)).size}`}
          sx={{ bgcolor: "#e0e7ff", color: "#1e3a8a", fontWeight: 700 }}
        />
      </Box>

      <Paper
        sx={{
          borderRadius: 0.5,
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          border: "1px solid #e2e8f0",
          p: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700} mb={2} color="#1e3a8a">
          Customer Repayments
        </Typography>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(59, 130, 246, 0.08)", borderBottom: "2px solid rgba(59, 130, 246, 0.16)" }}>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Scheduled Installment</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Repayment Day</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Account Officer</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Branch</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.875rem" }}>Repayment Summary</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                    No supervisor report rows match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                reportRows.map((row, idx) => {
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: idx % 2 === 0 ? "rgba(59, 130, 246, 0.04)" : "transparent",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                        "&:hover": { bgcolor: "rgba(59, 130, 246, 0.10)" },
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
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
                            {getLoanCycle(loanCycleMap, { id: row.id })}
                          </Box>
                          <span>{row.customerName}</span>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{formatNaira(row.installmentAmount)}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{row.repaymentDay}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{row.officer}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{row.branch}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Paid ${row.paidForLoan}`} size="small" sx={{ bgcolor: "rgba(22, 163, 74, 0.18)", color: "#166534", fontWeight: 700, fontSize: "0.75rem" }} />
                          <Chip label={`Pending ${row.pendingForLoan}`} size="small" sx={{ bgcolor: "rgba(217, 119, 6, 0.18)", color: "#92400e", fontWeight: 700, fontSize: "0.75rem" }} />
                          <Chip label={`Missed ${row.missedForLoan}`} size="small" sx={{ bgcolor: "rgba(220, 38, 38, 0.18)", color: "#991b1b", fontWeight: 700, fontSize: "0.75rem" }} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default GlobalReports;
