import React from "react";
import { Box, Paper, Typography, Chip, ButtonBase, useTheme } from "@mui/material";

/**
 * Mobile-friendly card component for displaying loan information
 */
export const LoanCard = ({ loan, loanCycle, formatCurrency, getLoanLifecycleStatus, onCustomerClick, compact = false }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  const lifecycleStatus = getLoanLifecycleStatus(loan);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return { bgcolor: "#fef3c7", color: "#92400e" };
      case "closed":
        return { bgcolor: "#d1fae5", color: "#065f46" };
      case "overdue":
        return { bgcolor: "#fee2e2", color: "#991b1b" };
      default:
        return { bgcolor: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <Paper
      sx={{
        p: compact ? 1.5 : 2,
        mb: compact ? 1 : 1.5,
        borderRadius: 1.5,
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e2e8f0",
        backgroundColor: dark ? "#1a2847" : "#ffffff",
        boxShadow: dark
          ? "0 10px 24px rgba(0,0,0,0.3)"
          : "0 10px 24px rgba(15,23,42,0.08)",
      }}
    >
      {/* Header: Customer Name and Status */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: compact ? 1 : 1.5, gap: compact ? 0.75 : 1 }}>
        <Box>
          <ButtonBase
            onClick={() => onCustomerClick?.(loan.customerName)}
            sx={{
              display: "inline-flex",
              justifyContent: "flex-start",
              textAlign: "left",
              borderRadius: 0.5,
              px: 0.2,
              mx: -0.2,
            }}
          >
            <Typography
              variant={compact ? "body2" : "subtitle2"}
              sx={{
                fontWeight: 700,
                color: dark ? "#f0f9ff" : "#0f172a",
                mb: compact ? 0.1 : 0.25,
              }}
            >
              {loan.customerName}
            </Typography>
          </ButtonBase>
          <Typography
            variant="caption"
            sx={{
              color: dark ? "#94a3b8" : "#64748b",
              display: "block",
            }}
          >
            Loan ID: {loan.id || "N/A"}
          </Typography>
        </Box>
        <Chip
          label={lifecycleStatus.charAt(0).toUpperCase() + lifecycleStatus.slice(1)}
          size="small"
          sx={{
            ...getStatusColor(lifecycleStatus),
            fontWeight: 600,
            fontSize: compact ? "0.65rem" : "0.7rem",
            height: compact ? 22 : 24,
          }}
        />
      </Box>

      {/* Amount and Interest */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 1 : 1.5, mb: compact ? 1 : 1.5 }}>
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
            Loan Amount
          </Typography>
          <Typography
            variant={compact ? "caption" : "body2"}
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {formatCurrency(loan.amount)}
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
            Interest Rate
          </Typography>
          <Typography
            variant={compact ? "caption" : "body2"}
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {loan.interestRate}%
          </Typography>
        </Box>
      </Box>

      {/* Tenor and Start Date */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 1 : 1.5, mb: compact ? 1 : 1.5 }}>
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
            Tenor (Months)
          </Typography>
          <Typography
            variant={compact ? "caption" : "body2"}
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {loan.tenor}
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
            Start Date
          </Typography>
          <Typography
            variant={compact ? "caption" : "body2"}
            sx={{
              fontWeight: 700,
              color: dark ? "#f0f9ff" : "#0f172a",
            }}
          >
            {loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "N/A"}
          </Typography>
        </Box>
      </Box>

      {/* Officer and Branch */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: compact ? 1 : 1.5 }}>
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
            {loan.officer || "N/A"}
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
            {loan.branch || "N/A"}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default LoanCard;
