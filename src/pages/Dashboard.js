import React, { useContext } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import TopBar from "../components/TopBar";

const Dashboard = () => {
  const { loans, repayments } = useContext(DataContext);

  // Summary calculations
const totalDisbursed = loans.reduce((sum, l) => sum + l.amount, 0);
const totalClients = new Set(loans.map(l => l.customerName)).size;

// Running Loan = total ₦ amount of loans not fully repaid
const runningLoanAmount = loans.reduce((sum, l) => {
  const loanRepayments = repayments.filter(r => r.loanId === l.id);
  const paidCountForLoan = loanRepayments.filter(r => r.status === "✅").length;
  return paidCountForLoan < l.tenor ? sum + l.amount : sum;
}, 0);

// Expected Repayments = total ₦ amount scheduled
const expectedRepaymentsAmount = repayments.reduce((sum, r) => sum + r.amount, 0);

// Paid = total ₦ amount successfully repaid
const paidAmount = repayments
  .filter(r => r.status === "✅")
  .reduce((sum, r) => sum + r.amount, 0);

// Missed = total ₦ amount failed
const missedAmount = repayments
  .filter(r => r.status === "❌")
  .reduce((sum, r) => sum + r.amount, 0);

  // Chart data
 const repaymentData = [
  { name: "Paid", value: paidAmount },
  { name: "Missed", value: missedAmount },
];

  const loanData = loans.map((loan) => ({
    date: loan.startDate,
    amount: loan.amount,
  }));

  return (
    <Box>
      <TopBar />
      <Box p={3}>
        {/* Summary Cards */}
       <Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <AttachMoneyIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Total Disbursed</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>
          ₦{totalDisbursed.toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <PeopleIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Total Clients</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>{totalClients}</Typography>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <TrendingUpIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Running Loan</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>
          ₦{runningLoanAmount.toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <AssessmentIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Expected Repayments</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>
          ₦{expectedRepaymentsAmount.toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <CheckCircleIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Paid</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>
          ₦{paidAmount.toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  </Grid>

  <Grid item xs={12} sm={6} md={4}>
    <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1, height: 85, display: "flex", width:285, alignItems: "center", gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, backgroundColor: "#1976d2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <CancelIcon />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="textSecondary">Missed</Typography>
        <Typography variant="h5" fontWeight="bold" noWrap>
          ₦{missedAmount.toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  </Grid>
</Grid>

        {/* Repayment Status Chart */}
        <Box mt={4}>
          <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Repayment Status Chart
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={repaymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  radius={[10, 10, 0, 0]}
                  fill={({ name }) => (name === "Paid" ? "#4caf50" : "#f44336")}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Loan Disbursement Chart */}
        <Box mt={4}>
          <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Loan Disbursements Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={loanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#82ca9d"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#82ca9d" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;