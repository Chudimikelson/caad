import React, { useContext, useMemo, useState } from "react";
import { DataContext } from "../DataContext";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Grid,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { buildLoanCycleMap, getLoanCycle } from "../utils/loanCycle";
import RepaymentCard from "../components/RepaymentCard";

const normalizeManagerName = (value) =>
  String(value || "").trim().replace(/\s*\(Officer\)$/i, "").trim();

const formatNaira = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const Repayments = () => {
  const { loans, repayments, user } = useContext(DataContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isRelationshipManager = user?.role === "Relationship Manager";
  const managerNames = useMemo(() => {
    if (!isRelationshipManager) return "";
    return normalizeManagerName(user?.name || user?.accountOfficer?.name);
  }, [isRelationshipManager, user]);

  const scopedLoans = useMemo(() => {
    if (!isRelationshipManager) return loans;
    if (!managerNames) return [];

    return loans.filter((loan) => normalizeManagerName(loan.officer) === managerNames);
  }, [isRelationshipManager, loans, managerNames]);

  const scopedLoanIds = useMemo(() => new Set(scopedLoans.map((loan) => loan.id)), [scopedLoans]);

  const scopedRepayments = useMemo(() => {
    if (!isRelationshipManager) return repayments;
    if (!managerNames) return [];

    return repayments.filter((repayment) => {
      const repaymentOfficer = normalizeManagerName(repayment.officer);
      if (managerNames === repaymentOfficer) return true;
      return scopedLoanIds.has(repayment.loanId);
    });
  }, [isRelationshipManager, managerNames, repayments, scopedLoanIds]);

  const loanCycleMap = useMemo(() => buildLoanCycleMap(scopedLoans), [scopedLoans]);

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
          scopedLoans
            .map((loan) => (typeof loan.officer === "string" ? loan.officer.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [scopedLoans]
  );

  const branches = useMemo(
    () =>
      Array.from(
        new Set(
          scopedLoans
            .map((loan) => (typeof loan.branch === "string" ? loan.branch.trim() : ""))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [scopedLoans]
  );

  const getRepaymentStatus = (repayment) => {
    if (repayment.status === "✅") return "paid";
    if (repayment.status === "❌") return "missed";
    return "pending";
  };

  const filteredRepayments = useMemo(() => {
    return scopedRepayments.filter((repayment) => {
      const repaymentLoan = scopedLoans.find((loan) => loan.id === repayment.loanId);
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

      if (filters.status && getRepaymentStatus(repayment) !== filters.status) {
        return false;
      }

      if (filters.customerSearch) {
        const customerName = repaymentLoan?.customerName || "";
        if (!customerName.toLowerCase().includes(filters.customerSearch.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [scopedRepayments, scopedLoans, filters]);

  const filteredLoanIds = new Set(filteredRepayments.map((repayment) => repayment.loanId));
  const filteredLoans = scopedLoans.filter((loan) => filteredLoanIds.has(loan.id));

  const paidCount = filteredRepayments.filter((r) => r.status === "✅").length;
  const missedCount = filteredRepayments.filter((r) => r.status === "❌").length;
  const pendingCount = filteredRepayments.filter((r) => r.status !== "✅" && r.status !== "❌").length;
  const scheduledAmount = filteredRepayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const paidAmount = filteredRepayments
    .filter((repayment) => repayment.status === "✅")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const missedAmount = filteredRepayments
    .filter((repayment) => repayment.status === "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
  const pendingAmount = filteredRepayments
    .filter((repayment) => repayment.status !== "✅" && repayment.status !== "❌")
    .reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

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

  const exportToCSV = () => {
    // Create array of repayment records
    const csvData = filteredRepayments.map((rep) => {
      const loan = loans.find((l) => l.id === rep.loanId);
      return {
        "Customer Name": rep.customerName || "",
        "Loan Amount": rep.loanAmount || "",
        "Repayment Amount": rep.amount || "",
        "Repayment Date": rep.date ? new Date(rep.date).toLocaleDateString() : "",
        "Status": rep.status === "✅" ? "Paid" : rep.status === "❌" ? "Missed" : "Pending",
        "Account Officer": rep.officer || "",
        "Branch": rep.branch || "",
        "Loan Status": loan ? loan.lifecycleStatus : "",
      };
    });

    if (csvData.length === 0) {
      alert("No repayments to export based on current filters.");
      return;
    }

    // Create CSV headers
    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            const valueStr = String(value);
            return valueStr.includes(",") ? `"${valueStr.replace(/"/g, '""')}"` : valueStr;
          })
          .join(",")
      ),
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `repayments_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to get ordinal day (2nd, 3rd, etc.)
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

  const summaryCards = [
    {
      title: "Scheduled Amount",
      value: formatNaira(scheduledAmount),
      subtitle: `${filteredRepayments.length} installments in report`,
      icon: <AccountBalanceWalletRoundedIcon />,
      accent: "#2563eb",
      tint: "#eff6ff",
    },
    {
      title: "Collected Amount",
      value: formatNaira(paidAmount),
      subtitle: `${paidCount} paid repayments`,
      icon: <TaskAltRoundedIcon />,
      accent: "#16a34a",
      tint: "#ecfdf5",
    },
    {
      title: "Pending Amount",
      value: formatNaira(pendingAmount),
      subtitle: `${pendingCount} pending repayments`,
      icon: <PendingActionsRoundedIcon />,
      accent: "#d97706",
      tint: "#fff7ed",
    },
    {
      title: "Missed Amount",
      value: formatNaira(missedAmount),
      subtitle: `${missedCount} missed repayments`,
      icon: <WarningAmberRoundedIcon />,
      accent: "#dc2626",
      tint: "#fef2f2",
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {summaryCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 4 }}>
            <Paper
              sx={{
                p: 2.25,
                borderRadius: 0.75,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 0.6, fontWeight: 600 }}>
                  {card.title}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: "#0f172a", fontWeight: 800, mb: 0.45, lineHeight: 1.15 }}
                >
                  {card.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", lineHeight: 1.5 }}>
                  {card.subtitle}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  borderRadius: 3,
                  bgcolor: card.tint,
                  color: card.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `inset 0 0 0 1px ${card.accent}22`,
                }}
              >
                {card.icon}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 0.75,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              value={filters.startDate}
              onChange={handleFilterChange("startDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              value={filters.endDate}
              onChange={handleFilterChange("endDate")}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {!isRelationshipManager && (
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
          )}

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

          <Grid size={{ xs: 12, md: 6 }}>
            <Button variant="outlined" onClick={resetFilters} sx={{ width: "100%" }}>
              Reset Filters
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button variant="contained" color="success" onClick={exportToCSV} sx={{ width: "100%" }}>
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip label={`Paid: ${paidCount}`} sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 700 }} />
        <Chip label={`Pending: ${pendingCount}`} sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
        <Chip label={`Missed: ${missedCount}`} sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700 }} />
        </Box>

        <TextField
          label="Search Customer"
          placeholder="Search by customer name"
          size="small"
          value={filters.customerSearch}
          onChange={handleFilterChange("customerSearch")}
          sx={{ minWidth: { xs: "100%", sm: 280, md: 320 } }}
        />
      </Box>

      {/* Repayments Table/Cards */}
      {isMobile ? (
        // Mobile Card View
        <Box>
          {filteredRepayments.length === 0 ? (
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
            filteredRepayments.map((repayment, idx) => {
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
        // Desktop Table View
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 0.75, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Scheduled Installment</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Day of Repayment</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Account Officer</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Branch</TableCell>
                <TableCell sx={{ bgcolor: "#f8fafc", fontWeight: 700 }}>Repayment Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "#64748b" }}>
                    No repayments match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((loan) => {
                  const loanRepayments = filteredRepayments
                    .filter((r) => r.loanId === loan.id)
                    .sort((left, right) => new Date(left.date) - new Date(right.date));
                  const repaymentDay = getOrdinalDay(loan.startDate);
                  const installmentAmount = loanRepayments[0]?.amount || 0;
                  const paidForLoan = loanRepayments.filter((r) => r.status === "✅").length;
                  const pendingForLoan = loanRepayments.filter((r) => r.status !== "✅" && r.status !== "❌").length;
                  const missedForLoan = loanRepayments.filter((r) => r.status === "❌").length;

                  return (
                    <TableRow
                      key={loan.id}
                      hover
                      sx={{
                        "&:nth-of-type(odd)": { bgcolor: "#fcfdff" },
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
                      <TableCell>{installmentAmount ? formatNaira(installmentAmount) : "-"}</TableCell>
                      <TableCell>{repaymentDay}</TableCell>
                      <TableCell>{loan.officer || "-"}</TableCell>
                      <TableCell>{loan.branch || "-"}</TableCell>
                      <TableCell>
                        {loanRepayments.length === 0
                          ? "-"
                          : (
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`Paid ${paidForLoan}`} size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 700 }} />
                                <Chip label={`Pending ${pendingForLoan}`} size="small" sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
                                <Chip label={`Missed ${missedForLoan}`} size="small" sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700 }} />
                              </Stack>
                            )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Repayments;