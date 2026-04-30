import React from "react";
import { Box, Paper, Typography, Chip, useTheme } from "@mui/material";

/**
 * Mobile-friendly card component for displaying repayment information
 */
export const RepaymentCard = ({ repayment, loan, formatCurrency }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const getStatusColor = (status) => {
    switch (status) {
      case "✅":
        return { bgcolor: "#d1fae5", color: "#065f46", label: "Paid" };
      case "❌":
        return { bgcolor: "#fee2e2", color: "#991b1b", label: "Missed" };
      default:
        return { bgcolor: "#fef3c7", color: "#92400e", label: "Pending" };
    }
  };

  const statusInfo = getStatusColor(repayment.status);

  return (
    <Paper
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 1.5,
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e2e8f0",
        backgroundColor: dark ? "#1a2847" : "#ffffff",
        boxShadow: dark
          ? "0 10px 24px rgba(0,0,0,0.3)"
          : "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      {/* Header: Loan Info and Status */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5, gap: 1 }}>
        <Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
              mb: 0.25,
            }}
          >
            {loan?.customerName || "Unknown Customer"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              display: "block",
            }}
          >
            Repayment #{repayment.id || "N/A"}
          </Typography>
        </Box>
        <Chip
          label={statusInfo.label}
          size="small"
          sx={{
            bgcolor: statusInfo.bgcolor,
            color: statusInfo.color,
            fontWeight: 600,
            fontSize: "0.7rem",
            height: 24,
          }}
        />
      </Box>

      {/* Amount and Due Date */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Repayment Amount
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {formatCurrency(repayment.amount)}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Due Date
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {repayment.dueDate ? new Date(repayment.dueDate).toLocaleDateString() : "N/A"}
          </Typography>
        </Box>
      </Box>

      {/* Payment Date and Loan Type */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Payment Date
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {repayment.date ? new Date(repayment.date).toLocaleDateString() : "Pending"}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Loan Type
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#cbd5e1" : "#475569",
              wordBreak: "break-word",
            }}
          >
            {loan?.loanType || "N/A"}
          </Typography>
        </Box>
      </Box>

      {/* Officer and Branch */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Account Officer
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#cbd5e1" : "#475569",
              wordBreak: "break-word",
            }}
          >
            {repayment.officer || "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              fontWeight: 600,
              display: "block",
              mb: 0.25,
            }}
          >
            Branch
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#cbd5e1" : "#475569",
              wordBreak: "break-word",
            }}
          >
            {repayment.branch || "N/A"}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RepaymentCard;
