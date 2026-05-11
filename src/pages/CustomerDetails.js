import React, { useContext, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DataContext } from "../DataContext";
import LoanCard from "../components/LoanCard";
import RepaymentCard from "../components/RepaymentCard";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const addMonthsPreservingDay = (baseDate, monthsToAdd) => {
  const source = new Date(baseDate);
  if (Number.isNaN(source.getTime())) return null;

  const target = new Date(source);
  const originalDay = source.getDate();

  target.setDate(1);
  target.setMonth(target.getMonth() + monthsToAdd);

  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return target;
};

const CustomerDetails = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isVerySmallMobile = useMediaQuery("(max-width:400px)");
  const navigate = useNavigate();
  const { customerName: encodedCustomerName } = useParams();
  const { loans, repayments } = useContext(DataContext);
  const [scheduleDialog, setScheduleDialog] = useState({ open: false, loan: null });
  const printRef = useRef(null);

  const customerName = decodeURIComponent(encodedCustomerName || "").trim();

  const customerLoans = useMemo(
    () =>
      (loans || []).filter(
        (loan) => String(loan.customerName || "").trim().toLowerCase() === customerName.toLowerCase()
      ),
    [loans, customerName]
  );

  const loanIds = useMemo(() => new Set(customerLoans.map((loan) => loan.id)), [customerLoans]);
  const loanById = useMemo(() => {
    const map = new Map();
    customerLoans.forEach((loan) => {
      map.set(String(loan.id || ""), loan);
    });
    return map;
  }, [customerLoans]);

  const customerRepayments = useMemo(
    () =>
      (repayments || []).filter((repayment) => {
        const repaymentCustomer = String(repayment.customerName || "").trim().toLowerCase();
        if (repaymentCustomer === customerName.toLowerCase()) return true;
        return loanIds.has(repayment.loanId);
      }),
    [repayments, customerName, loanIds]
  );

  const summary = useMemo(() => {
    const totalLoanAmount = customerLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const totalRepaymentAmount = customerRepayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
    const paidRepaymentList = customerRepayments.filter((repayment) => repayment.status === "✅");
    const pendingRepaymentList = customerRepayments.filter((repayment) => repayment.status !== "✅" && repayment.status !== "❌");
    const missedRepaymentList = customerRepayments.filter((repayment) => repayment.status === "❌");

    const paidRepayments = paidRepaymentList.length;
    const pendingRepayments = pendingRepaymentList.length;
    const missedRepayments = missedRepaymentList.length;

    const paidRepaymentAmount = paidRepaymentList.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
    const pendingRepaymentAmount = pendingRepaymentList.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);
    const missedRepaymentAmount = missedRepaymentList.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

    return {
      totalLoanAmount,
      totalRepaymentAmount,
      paidRepayments,
      pendingRepayments,
      missedRepayments,
      paidRepaymentAmount,
      pendingRepaymentAmount,
      missedRepaymentAmount,
    };
  }, [customerLoans, customerRepayments]);

  const getStatusChip = (status) => {
    if (status === "✅") return { label: "Paid", color: "success" };
    if (status === "❌") return { label: "Missed", color: "error" };
    return { label: "Pending", color: "warning" };
  };

  const handleViewSchedule = (loan) => {
    setScheduleDialog({ open: true, loan });
  };

  const handleCloseSchedule = () => {
    setScheduleDialog({ open: false, loan: null });
  };

  const handlePrintSchedule = () => {
    const loan = scheduleDialog.loan;
    if (!loan) return;
    const schedule = getScheduleRows(loan);
    const asDate = (v) => { if (!v) return "-"; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(); };
    const asNumber = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
    const principal = asNumber(loan.amount);
    const rate = asNumber(loan.interestRate);
    const tenor = Math.max(asNumber(loan.tenor), schedule.length, 1);
    const monthlyInterest = principal * (rate / 100);
    const totalInterest = monthlyInterest * tenor;
    const totalRepayment = principal + totalInterest;
    const expiryDate = addMonthsPreservingDay(loan.startDate, tenor);

    const rows = schedule.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("");
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Repayment Schedule - ${loan.customerName || ""}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h2{text-align:center;color:#032a78}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:6px 10px;font-size:12px}th{background:#f1f5f9}tr:nth-child(even){background:#f8fafc}.section{margin-bottom:16px}.section h3{margin:0 0 8px;font-size:14px;color:#0f172a}.line{margin:0 0 4px;font-size:13px}.label{font-weight:700;display:inline-block;min-width:160px}.branding{display:flex;align-items:center;gap:8px;margin-bottom:4px}@media print{button{display:none}}</style></head>
      <body>
        <div class="branding"><strong style="font-size:18px;color:#032a78">TAGORA</strong></div>
        <h2>Repayment Schedule</h2>
        <div class="section"><h3>Customer Details</h3>
          <p class="line"><span class="label">Customer Name:</span> ${loan.customerName || "-"}</p>
          <p class="line"><span class="label">Account Number:</span> N/A</p>
          <p class="line"><span class="label">Contact Address:</span> ${loan.contactAddress || loan.address || "N/A"}</p>
        </div>
        <div class="section"><h3>Loan Details</h3>
          <p class="line"><span class="label">Loan Amount:</span> ${formatCurrency(principal)}</p>
          <p class="line"><span class="label">Interest Rate:</span> ${rate}%</p>
          <p class="line"><span class="label">Tenor:</span> ${tenor} month(s)</p>
          <p class="line"><span class="label">Total Interest:</span> ${formatCurrency(totalInterest)}</p>
          <p class="line"><span class="label">Total Repayment:</span> ${formatCurrency(totalRepayment)}</p>
          <p class="line"><span class="label">Disbursement Date:</span> ${asDate(loan.startDate)}</p>
          <p class="line"><span class="label">Expiry Date:</span> ${expiryDate ? asDate(expiryDate) : "-"}</p>
        </div>
        <strong>Repayment Schedule</strong>
        <table><thead><tr><th>Due Date</th><th>Principal</th><th>Interest</th><th>Total Repayment</th></tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
  };

  const getScheduleRows = (loan) => {
    const asNumber = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
    const asDate = (v) => { if (!v) return "-"; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(); };
    const schedule = customerRepayments
      .filter((r) => String(r.loanId || "") === String(loan.id || ""))
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const principal = asNumber(loan.amount);
    const rate = asNumber(loan.interestRate);
    const tenor = Math.max(asNumber(loan.tenor), schedule.length, 1);
    const monthlyInterest = principal * (rate / 100);
    const totalInterest = monthlyInterest * tenor;
    const principalPerInstallment = principal / tenor;
    const interestPerInstallment = totalInterest / tenor;
    return schedule.map((repayment, index) => {
      const rowTotal = asNumber(repayment.amount) > 0 ? asNumber(repayment.amount) : principalPerInstallment + interestPerInstallment;
      return [
        asDate(repayment.date || repayment.dueDate),
        formatCurrency(principalPerInstallment),
        formatCurrency(interestPerInstallment),
        formatCurrency(rowTotal),
      ];
    });
  };

  const handlePrintRepaymentSchedule = async (loan) => {
    const schedule = customerRepayments
      .filter((repayment) => String(repayment.loanId || "") === String(loan.id || ""))
      .sort((left, right) => new Date(left.date || 0) - new Date(right.date || 0));

    if (!schedule.length) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const asDate = (value) => {
      if (!value) return "-";
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleDateString();
    };
    const asNumber = (value) => {
      const n = Number(value);
      return Number.isNaN(n) ? 0 : n;
    };
    const formatPdfCurrency = (value) => {
      const num = asNumber(value);
      return num.toLocaleString("en-NG", { maximumFractionDigits: 0 });
    };

    const fetchLogoDataUrl = async () => {
      try {
        const logoUrl = `${process.env.PUBLIC_URL || ""}/tagora-logo.png`;
        const response = await fetch(logoUrl);
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        return null;
      }
    };

    const principalAmount = asNumber(loan.amount);
    const interestRate = asNumber(loan.interestRate);
    const tenor = Math.max(asNumber(loan.tenor), schedule.length, 1);
    const monthlyInterest = principalAmount * (interestRate / 100);
    const totalInterest = monthlyInterest * tenor;
    const totalRepayment = principalAmount + totalInterest;
    const principalPerInstallment = principalAmount / tenor;
    const interestPerInstallment = totalInterest / tenor;
    const expiryDate = addMonthsPreservingDay(loan.startDate, tenor);

    const logoDataUrl = await fetchLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 40, 24, 44, 44);
    }

    doc.setFontSize(16);
    doc.setTextColor(3, 42, 120);
    doc.text("TAGORA", 90, 50);

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Repayment Schedule", pageWidth / 2, 50, { align: "center" });

    const accountNumber = "N/A (To be updated)";
    const contactAddress = loan.contactAddress || loan.address || "N/A (To be updated)";

    let sectionY = 88;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Customer Details", 40, sectionY);

    sectionY += 16;
    doc.setFontSize(10);
    doc.text(`Customer Name: ${loan.customerName || "-"}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Account Number: ${accountNumber}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Contact Address: ${contactAddress}`, 40, sectionY);

    sectionY += 22;
    doc.setFontSize(12);
    doc.text("Loan Details", 40, sectionY);

    sectionY += 16;
    doc.setFontSize(10);
    doc.text(`Loan Amount: ${formatPdfCurrency(principalAmount)}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Interest Rate: ${interestRate}%`, 40, sectionY);
    sectionY += 14;
    doc.text(`Tenor: ${tenor} month(s)`, 40, sectionY);
    sectionY += 14;
    doc.text(`Total Interest: ${formatPdfCurrency(totalInterest)}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Total Repayment: ${formatPdfCurrency(totalRepayment)}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Disbursement Date: ${asDate(loan.startDate)}`, 40, sectionY);
    sectionY += 14;
    doc.text(`Expiry Date: ${expiryDate ? asDate(expiryDate) : "-"}`, 40, sectionY);

    const scheduleRows = schedule.map((repayment, index) => {
      const rowTotalRepayment = asNumber(repayment.amount) > 0 ? asNumber(repayment.amount) : principalPerInstallment + interestPerInstallment;

      return [
        asDate(repayment.date || repayment.dueDate),
        formatPdfCurrency(principalPerInstallment),
        formatPdfCurrency(interestPerInstallment),
        formatPdfCurrency(rowTotalRepayment),
      ];
    });

    autoTable(doc, {
      startY: sectionY + 20,
      theme: "grid",
      head: [["Due Date", "Principal", "Interest", "Total Repayment"]],
      body: scheduleRows,
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
      },
      tableLineColor: [203, 213, 225],
      tableLineWidth: 0.5,
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 120 },
        2: { cellWidth: 120 },
        3: { cellWidth: 140 },
      },
    });

    const safeCustomer = String(loan.customerName || "customer")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "customer";

    doc.save(`repayment-schedule-${safeCustomer}-${String(loan.id || "loan")}.pdf`);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e3a8a">
            Customer Details
          </Typography>
          <Typography variant="body1" sx={{ color: "#475569", mt: 0.4, fontWeight: 600 }}>
            {customerName || "Unknown Customer"}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/loans")}
        >
          Back to Loans
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5 }}>Total Loans</Typography>
            <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 800 }}>{formatCurrency(summary.totalLoanAmount)}</Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Count: <strong>{customerLoans.length}</strong>
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper sx={{ p: 2, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5 }}>Total Repayments</Typography>
            <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 800 }}>{formatCurrency(summary.totalRepaymentAmount)}</Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Count: <strong>{customerRepayments.length}</strong>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5 }}>Paid Repayments</Typography>
            <Typography variant="h6" sx={{ color: "#166534", fontWeight: 800 }}>{formatCurrency(summary.paidRepaymentAmount)}</Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Count: <strong>{summary.paidRepayments}</strong>
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5 }}>Pending Repayments</Typography>
            <Typography variant="h6" sx={{ color: "#92400e", fontWeight: 800 }}>{formatCurrency(summary.pendingRepaymentAmount)}</Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Count: <strong>{summary.pendingRepayments}</strong>
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ color: "#64748b", mb: 0.5 }}>Missed Repayments</Typography>
            <Typography variant="h6" sx={{ color: "#991b1b", fontWeight: 800 }}>{formatCurrency(summary.missedRepaymentAmount)}</Typography>
            <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
              Count: <strong>{summary.missedRepayments}</strong>
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
        <Typography variant="h6" sx={{ mb: 1.5, color: "#0f172a" }}>Loans</Typography>
        {isMobile ? (
          <Box>
            {customerLoans.length === 0 ? (
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
                  No loans found for this customer.
                </Typography>
              </Paper>
            ) : (
              customerLoans.map((loan) => (
                <Box key={loan.id} sx={{ mb: 1.5 }}>
                  <LoanCard
                    loan={loan}
                    loanCycle="-"
                    formatCurrency={formatCurrency}
                    getLoanLifecycleStatus={(item) => String(item.lifecycleStatus || "active").toLowerCase()}
                    onCustomerClick={() => {}}
                    compact={isVerySmallMobile}
                  />
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: isVerySmallMobile ? 0 : -0.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewSchedule(loan)}
                      disabled={!customerRepayments.some((repayment) => String(repayment.loanId || "") === String(loan.id || ""))}
                    >
                      View Schedule
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Loan Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Interest Rate</TableCell>
                  <TableCell>Tenor</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>Relationship Manager</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Repayment Schedule</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: "center", py: 3, color: "#64748b" }}>
                      No loans found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  customerLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.loanType || "-"}</TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>{loan.interestRate || "-"}%</TableCell>
                      <TableCell>{loan.tenor || "-"}</TableCell>
                      <TableCell>{loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{loan.officer || "-"}</TableCell>
                      <TableCell>{loan.branch || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewSchedule(loan)}
                          disabled={!customerRepayments.some((repayment) => String(repayment.loanId || "") === String(loan.id || ""))}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 0.75, border: "1px solid #e2e8f0" }}>
        <Typography variant="h6" sx={{ mb: 1.5, color: "#0f172a" }}>Repayments</Typography>
        {isMobile ? (
          <Box>
            {customerRepayments.length === 0 ? (
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
                  No repayments found for this customer.
                </Typography>
              </Paper>
            ) : (
              customerRepayments.map((repayment, idx) => {
                const linkedLoan = loanById.get(String(repayment.loanId || ""));
                return (
                  <RepaymentCard
                    key={repayment.id || idx}
                    repayment={repayment}
                    loan={linkedLoan}
                    formatCurrency={formatCurrency}
                    compact={isVerySmallMobile}
                  />
                );
              })
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Relationship Manager</TableCell>
                  <TableCell>Branch</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerRepayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", py: 3, color: "#64748b" }}>
                      No repayments found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  customerRepayments.map((repayment) => {
                    const statusInfo = getStatusChip(repayment.status);
                    return (
                      <TableRow key={repayment.id}>
                        <TableCell>{repayment.date ? new Date(repayment.date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{formatCurrency(repayment.amount)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                        </TableCell>
                        <TableCell>{repayment.officer || "-"}</TableCell>
                        <TableCell>{repayment.branch || "-"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      {/* Repayment Schedule Dialog */}
      {scheduleDialog.open && scheduleDialog.loan && (() => {
        const loan = scheduleDialog.loan;
        const asNumber = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
        const asDate = (v) => { if (!v) return "-"; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(); };
        const principal = asNumber(loan.amount);
        const rate = asNumber(loan.interestRate);
        const scheduleRows = getScheduleRows(loan);
        const tenor = Math.max(asNumber(loan.tenor), scheduleRows.length, 1);
        const monthlyInterest = principal * (rate / 100);
        const totalInterest = monthlyInterest * tenor;
        const totalRepayment = principal + totalInterest;
        const expiryDate = addMonthsPreservingDay(loan.startDate, tenor);
        return (
          <Dialog open onClose={handleCloseSchedule} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ pb: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#032a78" }}>TAGORA</Typography>
              </Box>
              <Typography variant="subtitle1" sx={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>Repayment Schedule</Typography>
            </DialogTitle>
            <DialogContent dividers ref={printRef}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8, color: "#0f172a" }}>Customer Details</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Customer Name:</strong> {loan.customerName || "-"}</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Account Number:</strong> N/A</Typography>
                <Typography variant="body2"><strong>Contact Address:</strong> {loan.contactAddress || loan.address || "N/A"}</Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8, color: "#0f172a" }}>Loan Details</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Loan Amount:</strong> {formatCurrency(principal)}</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Interest Rate:</strong> {rate}%</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Tenor:</strong> {tenor} month(s)</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Total Interest:</strong> {formatCurrency(totalInterest)}</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Total Repayment:</strong> {formatCurrency(totalRepayment)}</Typography>
                <Typography variant="body2" sx={{ mb: 0.4 }}><strong>Disbursement Date:</strong> {asDate(loan.startDate)}</Typography>
                <Typography variant="body2"><strong>Expiry Date:</strong> {expiryDate ? asDate(expiryDate) : "-"}</Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#0f172a" }}>Repayment Schedule</Typography>
              <TableContainer>
                <Table size="small" sx={{ border: "1px solid #e2e8f0" }}>
                  <TableHead>
                    <TableRow sx={{ background: "#f1f5f9" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Principal</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Interest</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Total Repayment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scheduleRows.length === 0 ? (
                      <TableRow><TableCell colSpan={4} sx={{ textAlign: "center", py: 2, color: "#64748b" }}>No schedule data available.</TableCell></TableRow>
                    ) : (
                      scheduleRows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
              <Button onClick={handleCloseSchedule} variant="text" color="inherit">Close</Button>
              <Button
                onClick={handlePrintSchedule}
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                Print
              </Button>
              <Button
                onClick={() => handlePrintRepaymentSchedule(loan)}
                variant="contained"
                startIcon={<PictureAsPdfIcon />}
              >
                Export PDF
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}
    </Box>
  );
};

export default CustomerDetails;
