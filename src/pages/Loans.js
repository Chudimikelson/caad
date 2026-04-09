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

const Loans = () => {
  const { loans } = useContext(DataContext);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Loans
      </Typography>
      <TableContainer component={Paper}sx={{ p: 3, borderRadius: 1, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Loan Amount</TableCell>
              <TableCell>Interest Rate (%)</TableCell>
              <TableCell>Tenor (months)</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Account Officer</TableCell>
              <TableCell>Branch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>{loan.id}</TableCell>
                <TableCell>{loan.customerName}</TableCell>
                <TableCell>${loan.amount}</TableCell>
                <TableCell>{loan.interestRate}</TableCell>
                <TableCell>{loan.tenor}</TableCell>
                <TableCell>{loan.startDate}</TableCell>
                <TableCell>{loan.officer}</TableCell>
                <TableCell>{loan.branch}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Loans;