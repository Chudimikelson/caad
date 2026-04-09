import React, { useContext } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const Repayments = () => {
  const { loans, repayments } = useContext(DataContext);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Repayments
      </Typography>
      <TableContainer component={Paper} sx={{ p: 3, borderRadius: 1, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
              <TableCell>Loan ID</TableCell>
              <TableCell>Loan Amount</TableCell>
              <TableCell>Repayment Day</TableCell>
              <TableCell>Officer</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Repayments</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((loan) => {
              const loanRepayments = repayments.filter((r) => r.loanId === loan.id);
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
                    {loanRepayments.map((r) => (
                      <span
                        key={r.id}
                        style={{
                          marginRight: "8px",
                          fontSize: "20px",
                          color:
                            r.status === "✅"
                              ? "green"
                              : r.status === "❌"
                              ? "red"
                              : "gray",
                        }}
                      >
                        {r.status || "⚪"}
                      </span>
                    ))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Repayments;