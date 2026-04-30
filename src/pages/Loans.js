import React, { useContext } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const Loans = () => {
  const { loans } = useContext(DataContext);
  const totalAmount = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Loans
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Chip
          label={`Total Loans: ${loans.length}`}
          sx={{ bgcolor: "#e2e8f0", color: "#0f172a", fontWeight: 600 }}
        />
        <Chip
          label={`Total Value: ${new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(totalAmount)}`}
          sx={{ bgcolor: "#dbeafe", color: "#1e3a8a", fontWeight: 600 }}
        />
      </Box>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Customer Name</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Loan Amount</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Interest Rate (%)</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Tenor (months)</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Start Date</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Account Officer</TableCell>
              <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Branch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                  No loans yet. Create a loan from the Credit Admin page.
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow
                  key={loan.id}
                  hover
                  sx={{
                    "&:nth-of-type(odd)": { bgcolor: "#fcfdff" },
                  }}
                >
                  <TableCell>{loan.customerName}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                      maximumFractionDigits: 0,
                    }).format(Number(loan.amount || 0))}
                  </TableCell>
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
    </Box>
  );
};

export default Loans;