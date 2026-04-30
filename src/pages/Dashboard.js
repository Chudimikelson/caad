import React, { useContext } from "react";
import { DataContext } from "../DataContext";
import { Box, Grid, Paper, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const formatNaira = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatMonthLabel = (value) =>
  new Date(`${value}-01`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

const formatMillions = (value) => {
  const numericValue = Number(value || 0);
  if (numericValue === 0) return "0M";
  return `${(numericValue / 1000000).toFixed(numericValue >= 10000000 ? 0 : 1)}M`;
};

const Dashboard = () => {
  const { loans, repayments } = useContext(DataContext);

  const totalDisbursed = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const totalClients = new Set(loans.map((loan) => loan.customerName)).size;

  const runningLoanAmount = loans.reduce((sum, loan) => {
    const loanRepayments = repayments.filter((repayment) => repayment.loanId === loan.id);
    const paidCountForLoan = loanRepayments.filter((repayment) => repayment.status === "✅").length;
    return paidCountForLoan < Number(loan.tenor || 0) ? sum + Number(loan.amount || 0) : sum;
  }, 0);

  const expectedRepaymentsAmount = repayments.reduce(
    (sum, repayment) => sum + Number(repayment.amount || 0),
    0
  );
  const paidAmount = repayments
    .filter((repayment) => repayment.status === "✅")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const missedAmount = repayments
    .filter((repayment) => repayment.status === "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

  const repaymentData = [
    { name: "Paid", value: paidAmount, color: "#16a34a" },
    { name: "Missed", value: missedAmount, color: "#dc2626" },
  ];

  const loanData = Object.values(
    loans.reduce((accumulator, loan) => {
      if (!loan.startDate) return accumulator;

      const monthKey = loan.startDate.slice(0, 7);
      if (!accumulator[monthKey]) {
        accumulator[monthKey] = {
          month: monthKey,
          amount: 0,
          loansCount: 0,
        };
      }

      accumulator[monthKey].amount += Number(loan.amount || 0);
      accumulator[monthKey].loansCount += 1;
      return accumulator;
    }, {})
  ).sort((a, b) => a.month.localeCompare(b.month));

  const stats = [
    {
      label: "Total Disbursed",
      value: formatNaira(totalDisbursed),
      icon: <AttachMoneyIcon />,
      color: "#1e3a8a",
    },
    { label: "Total Clients", value: totalClients, icon: <PeopleIcon />, color: "#0f766e" },
    {
      label: "Running Loan",
      value: formatNaira(runningLoanAmount),
      icon: <TrendingUpIcon />,
      color: "#7c2d12",
    },
    {
      label: "Expected Repayments",
      value: formatNaira(expectedRepaymentsAmount),
      icon: <AssessmentIcon />,
      color: "#7e22ce",
    },
    { label: "Paid", value: formatNaira(paidAmount), icon: <CheckCircleIcon />, color: "#166534" },
    { label: "Missed", value: formatNaira(missedAmount), icon: <CancelIcon />, color: "#b91c1c" },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Grid container spacing={2}>
        {stats.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, xl: 4 }}>
            <Paper
              sx={{
                p: 2.25,
                borderRadius: 0.75,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                minHeight: 112,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {item.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 0.2 }}>
                  {item.label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "#0f172a" }}
                  noWrap
                  title={String(item.value)}
                >
                  {item.value}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 0.75,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Monthly Loan Disbursement Performance
            </Typography>
            {loanData.length === 0 ? (
              <Box
                sx={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <Typography variant="body2">No disbursement data yet.</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={loanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthLabel}
                  />
                  <YAxis yAxisId="amount" tickFormatter={formatMillions} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(value) => formatMonthLabel(value)}
                    formatter={(value, name) => {
                      if (name === "Disbursed") {
                        return [formatNaira(value), name];
                      }

                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="amount"
                    dataKey="amount"
                    fill="#1e3a8a"
                    radius={[8, 8, 0, 0]}
                    name="Disbursed"
                  />
                  <Bar
                    yAxisId="count"
                    dataKey="loansCount"
                    fill="#0f766e"
                    radius={[8, 8, 0, 0]}
                    name="Loans Count"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 0.75,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              height: "100%",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Repayment Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={repaymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatMillions} />
                <Tooltip formatter={(value) => formatNaira(value)} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {repaymentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
