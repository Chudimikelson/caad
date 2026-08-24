import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import SavingsIcon from "@mui/icons-material/Savings";
import AssessmentIcon from "@mui/icons-material/Assessment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import LogoutIcon from "@mui/icons-material/Logout";
import { DataContext } from "../DataContext";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const menuItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
    description: "Overview of the CBA workspace.",
  },
  {
    key: "ledgers-reports",
    label: "Ledgers and Reports",
    icon: <ReceiptLongIcon />,
    description: "Track ledger activity and reporting outputs.",
  },
  {
    key: "customers-management",
    label: "Customers management",
    icon: <PeopleIcon />,
    description: "Manage customer records and relationships.",
  },
  {
    key: "accounts-management",
    label: "Accounts management",
    icon: <AccountBalanceIcon />,
    description: "Review and maintain account structures.",
  },
  {
    key: "loans-management",
    label: "Loans management",
    icon: <CurrencyExchangeIcon />,
    description: "Monitor lending activity and repayment health.",
  },
  {
    key: "credit-decision",
    label: "Credit Decision",
    icon: <AssessmentIcon />,
    description: "Collect application data and evaluate statement of account signals.",
  },
  {
    key: "direct-debit-mandate",
    label: "Direct debit mandate",
    icon: <SavingsIcon />,
    description: "Handle mandate setup and debit instructions.",
  },
  {
    key: "target-saving-management",
    label: "Target Saving management",
    icon: <SavingsIcon />,
    description: "Manage customer target savings plans.",
  },
  {
    key: "accounting-reports",
    label: "Accounting reports",
    icon: <AssessmentIcon />,
    description: "Review accounting summaries and statements.",
  },
  {
    key: "bulk-imports",
    label: "Bulk imports",
    icon: <UploadFileIcon />,
    description: "Import records and batch data updates.",
  },
  {
    key: "platform-admin",
    label: "Platform Admin",
    icon: <AdminPanelSettingsIcon />,
    description: "Configure platform-level controls and access.",
  },
  {
    key: "profile-security",
    label: "Profile & Security",
    icon: <SecurityIcon />,
    description: "Update profile details and security settings.",
  },
  {
    key: "logout",
    label: "Log Out",
    icon: <LogoutIcon />,
    description: "Sign out of the application.",
  },
];

const sectionDetails = {
  dashboard: {
    title: "CBA Dashboard",
    summary:
      "A central workspace for operations, monitoring, and quick access to the CBA module.",
    highlight: "Start here to review the current state of the module.",
  },
  "ledgers-reports": {
    title: "Ledgers and Reports",
    summary: "Keep ledger activity, reconciliations, and reporting outputs in one place.",
    highlight: "Prepared for financial review and operational reporting.",
  },
  "customers-management": {
    title: "Customers management",
    summary: "Create, update, and review customer records with consistent controls.",
    highlight: "Supports onboarding and customer lifecycle management.",
  },
  "accounts-management": {
    title: "Accounts management",
    summary: "Maintain account structures and view balances across the CBA module.",
    highlight: "Designed for account administration and oversight.",
  },
  "loans-management": {
    title: "Loans management",
    summary: "Track loan portfolios, lending exposure, repayment progress, and approval workflow.",
    highlight: "Core loan management features are organized here for day-to-day credit operations.",
  },
  "credit-decision": {
    title: "Credit Decision",
    summary:
      "Collect loan application data, review the statement of account, and generate a decision recommendation.",
    highlight: "Use the screening inputs below to review affordability and account behavior before approval.",
  },
  "direct-debit-mandate": {
    title: "Direct debit mandate",
    summary: "Manage mandate creation, approval, and lifecycle tracking.",
    highlight: "Ready for debit collection workflows.",
  },
  "target-saving-management": {
    title: "Target Saving management",
    summary: "Organize customer savings targets and track achievement status.",
    highlight: "Built for savings planning and follow-up.",
  },
  "accounting-reports": {
    title: "Accounting reports",
    summary: "Produce finance-ready views for posting, audit, and control checks.",
    highlight: "Structured for downstream accounting review.",
  },
  "bulk-imports": {
    title: "Bulk imports",
    summary: "Load files, validate batches, and manage import history.",
    highlight: "Useful for onboarding larger data sets.",
  },
  "platform-admin": {
    title: "Platform Admin",
    summary: "Configure permissions, workflows, and module-wide settings.",
    highlight: "Reserved for elevated administration tasks.",
  },
  "profile-security": {
    title: "Profile & Security",
    summary: "Update your profile and security preferences from one screen.",
    highlight: "Supports account hygiene and access control.",
  },
};

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the uploaded file."));
    reader.readAsArrayBuffer(file);
  });

const extractPdfLines = async (file) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const buckets = new Map();

    content.items.forEach((item) => {
      const y = Math.round(item.transform?.[5] ?? 0);
      const x = Math.round(item.transform?.[4] ?? 0);
      if (!buckets.has(y)) buckets.set(y, []);
      buckets.get(y).push({ x, text: toText(item.str) });
    });

    const sortedY = Array.from(buckets.keys()).sort((left, right) => right - left);
    sortedY.forEach((y) => {
      const parts = buckets.get(y).sort((left, right) => left.x - right.x).map((part) => part.text).filter(Boolean);
      if (!parts.length) return;
      lines.push(parts.join(" "));
    });
  }

  const text = lines.join("\n");
  const rows = extractRowsFromFreeText(text);
  return { text, rows };
};

const formatNumber = (value) => {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toText = (value) => String(value ?? "").replace(/\u00a0/g, " ").trim();

const parseDateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = toText(value);
  if (!text) return null;

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dateMatch = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dateMatch) {
    const [, first, second, yearPart] = dateMatch;
    const year = yearPart.length === 2 ? Number(`20${yearPart}`) : Number(yearPart);
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const month = firstNumber > 12 ? secondNumber - 1 : firstNumber - 1;
    const day = firstNumber > 12 ? firstNumber : secondNumber;
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const formatDateDisplay = (value) => {
  const parsed = parseDateValue(value);
  return parsed
    ? parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : toText(value);
};

const looksLikeDate = (value) => Boolean(parseDateValue(value));

const extractSignedAmount = (text) => {
  const cleaned = toText(text)
    .replace(/[(),]/g, "")
    .replace(/\s+/g, " ")
    .replace(/(ngn|naira|₦)/gi, "");
  const amountMatch = cleaned.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/g);
  if (!amountMatch) return 0;
  return formatNumber(amountMatch[amountMatch.length - 1].replace(/,/g, ""));
};

const normalizeHeaderText = (value) =>
  toText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const detectStatementHeader = (rows) => {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const normalized = row.map((cell) => normalizeHeaderText(cell));

    const indices = {
      date: normalized.findIndex((cell) => /value date|txn date|date/.test(cell)),
      description: normalized.findIndex((cell) => /narration|description|remarks|particular|details/.test(cell)),
      debit: normalized.findIndex((cell) => /debit|withdraw|outflow|dr/.test(cell)),
      credit: normalized.findIndex((cell) => /credit|deposit|inflow|cr/.test(cell)),
      amount: normalized.findIndex((cell) => /^amount$|transaction amount/.test(cell)),
      balance: normalized.findIndex((cell) => /balance/.test(cell)),
      type: normalized.findIndex((cell) => /type|dr cr|tran type/.test(cell)),
    };

    const hasDateLike = indices.date >= 0;
    const hasAmountLike = indices.debit >= 0 || indices.credit >= 0 || indices.amount >= 0;

    if (hasDateLike && hasAmountLike) {
      return { rowIndex, indices };
    }
  }

  return null;
};

const transactionTypeFromText = (text) => {
  const lowered = toText(text).toLowerCase();
  if (/credit|inflow|deposit|receipt/.test(lowered)) return "credit";
  if (/debit|outflow|withdraw|charge|payment|transfer out/.test(lowered)) return "debit";
  return "unknown";
};

const extractStatementTransactionsFromRows = (rows) => {
  const transactions = [];

  const header = detectStatementHeader(rows);
  const startIndex = header ? header.rowIndex + 1 : 0;

  for (let index = startIndex; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const cells = row.map((cell) => toText(cell));
    const nonEmpty = cells.filter(Boolean);
    if (!nonEmpty.length) continue;

    let parsedDate = null;
    let description = "";
    let creditAmount = 0;
    let debitAmount = 0;
    let balanceAmount = null;

    if (header) {
      const { indices } = header;
      parsedDate = indices.date >= 0 ? parseDateValue(cells[indices.date]) : null;
      description = indices.description >= 0 ? toText(cells[indices.description]) : "";
      if (!description) {
        description = nonEmpty.filter((value) => !looksLikeDate(value)).slice(0, 3).join(" ");
      }

      debitAmount = indices.debit >= 0 ? Math.abs(extractSignedAmount(cells[indices.debit])) : 0;
      creditAmount = indices.credit >= 0 ? Math.abs(extractSignedAmount(cells[indices.credit])) : 0;
      balanceAmount = indices.balance >= 0 ? Math.abs(extractSignedAmount(cells[indices.balance])) : null;

      if (!debitAmount && !creditAmount && indices.amount >= 0) {
        const rawAmount = Math.abs(extractSignedAmount(cells[indices.amount]));
        const typeHint = indices.type >= 0 ? normalizeHeaderText(cells[indices.type]) : normalizeHeaderText(description);
        if (/credit|cr|deposit|inflow/.test(typeHint)) creditAmount = rawAmount;
        if (/debit|dr|withdraw|outflow|charge|payment/.test(typeHint)) debitAmount = rawAmount;
      }
    } else {
      const dateCellIndex = cells.findIndex((cell) => looksLikeDate(cell));
      const amountCellIndexFromEnd = [...cells].reverse().findIndex((cell) => /\d/.test(cell));
      const amountIndex = amountCellIndexFromEnd >= 0 ? cells.length - 1 - amountCellIndexFromEnd : -1;
      parsedDate = dateCellIndex >= 0 ? parseDateValue(cells[dateCellIndex]) : null;
      const descriptionCells = cells.filter((_, cellIndex) => cellIndex !== dateCellIndex && cellIndex !== amountIndex);
      description = descriptionCells.join(" ").trim() || nonEmpty.join(" ");
      const amount = Math.abs(extractSignedAmount(amountIndex >= 0 ? cells[amountIndex] : description));
      const type = transactionTypeFromText(description);
      if (type === "credit") creditAmount = amount;
      else if (type === "debit") debitAmount = amount;
    }

    if (!parsedDate || !description) continue;
    if (!debitAmount && !creditAmount) continue;

    if (creditAmount > 0) {
      transactions.push({
        id: `${index}-credit-${description}-${creditAmount}`,
        date: parsedDate,
        dateLabel: formatDateDisplay(parsedDate),
        description,
        type: "credit",
        amount: creditAmount,
        balance: balanceAmount,
      });
    }

    if (debitAmount > 0) {
      transactions.push({
        id: `${index}-debit-${description}-${debitAmount}`,
        date: parsedDate,
        dateLabel: formatDateDisplay(parsedDate),
        description,
        type: "debit",
        amount: debitAmount,
        balance: balanceAmount,
      });
    }
  }

  return transactions;
};

const buildStatementAnalysis = (transactions, fallbackText = "") => {
  const isLoanRepayment = (description) =>
    /loan\s*repay|repayment|installment|instalment|loan payment|facility repayment/.test(
      String(description || "").toLowerCase()
    );

  const enriched = transactions
    .map((transaction) => ({
      ...transaction,
      amount: Math.abs(formatNumber(transaction.amount)),
    }))
    .sort((left, right) => right.date - left.date);

  const credits = enriched.filter((transaction) => transaction.type === "credit").reduce((sum, transaction) => sum + transaction.amount, 0);
  const debits = enriched.filter((transaction) => transaction.type === "debit").reduce((sum, transaction) => sum + transaction.amount, 0);
  const unknown = enriched.filter((transaction) => transaction.type === "unknown");
  const bouncedTransactions = enriched.filter((transaction) => /bounce|returned|failed|insufficient/.test(transaction.description.toLowerCase())).length;
  const transactionCount = enriched.length;
  const averageTransactionSize = transactionCount > 0 ? (credits + debits) / transactionCount : 0;
  const statementCashFlow = credits - debits;
  const monthlyBuckets = enriched.reduce((accumulator, transaction) => {
    const monthKey = transaction.date.toISOString().slice(0, 7);
    if (!accumulator[monthKey]) {
      accumulator[monthKey] = { month: monthKey, credit: 0, debit: 0, count: 0 };
    }
    accumulator[monthKey].count += 1;
    if (transaction.type === "credit") accumulator[monthKey].credit += transaction.amount;
    if (transaction.type === "debit") accumulator[monthKey].debit += transaction.amount;
    return accumulator;
  }, {});

  const monthlyActivity = Object.values(monthlyBuckets).sort((left, right) => left.month.localeCompare(right.month));
  const monthsObserved = Math.max(monthlyActivity.length, 1);
  const loanRepayments = enriched
    .filter((transaction) => transaction.type === "debit" && isLoanRepayment(transaction.description))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = Math.max(debits - loanRepayments, 0);
  const averageMonthlyDeposits = credits / monthsObserved;
  const averageMonthlyPayments = debits / monthsObserved;
  const monthlyBalances = monthlyActivity
    .map((month) => {
      const balances = enriched
        .filter((transaction) => transaction.date.toISOString().slice(0, 7) === month.month)
        .map((transaction) => formatNumber(transaction.balance))
        .filter((value) => value > 0);
      if (!balances.length) return null;
      return balances.reduce((sum, value) => sum + value, 0) / balances.length;
    })
    .filter((value) => value != null);
  const averageMonthlyBalance = monthlyBalances.length
    ? monthlyBalances.reduce((sum, value) => sum + value, 0) / monthlyBalances.length
    : 0;
  const largestCredits = [...enriched].filter((transaction) => transaction.type === "credit").sort((left, right) => right.amount - left.amount).slice(0, 3);
  const largestDebits = [...enriched].filter((transaction) => transaction.type === "debit").sort((left, right) => right.amount - left.amount).slice(0, 3);
  const anomalies = enriched.filter((transaction) => /bounce|returned|failed|insufficient|chargeback|reversal/.test(transaction.description.toLowerCase())).slice(0, 5);

  return {
    transactions: enriched,
    totalCredits: credits,
    totalDebits: debits,
    netCashFlow: statementCashFlow,
    transactionCount,
    averageTransactionSize,
    bouncedTransactions,
    loanRepayments,
    expenses,
    averageMonthlyDeposits,
    averageMonthlyPayments,
    averageMonthlyBalance,
    unknownTransactions: unknown.length,
    monthlyActivity,
    largestCredits,
    largestDebits,
    anomalies,
    summaryText: fallbackText,
  };
};

const extractRowsFromFreeText = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.split(/\s{2,}|\t+/).map((part) => part.trim()).filter(Boolean))
    .filter((row) => row.length > 0);

const extractStatementMetrics = (text) => {
  const normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lowered = normalized.toLowerCase();

  const parseAmount = (pattern) => {
    const match = lowered.match(pattern);
    if (!match) return 0;
    return formatNumber(match[1].replace(/[,\s]/g, ""));
  };

  const credits =
    parseAmount(/(?:total\s+credits?|credits?|inflows?)\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i) ||
    parseAmount(/credit\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i);
  const debits =
    parseAmount(/(?:total\s+debits?|debits?|outflows?)\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i) ||
    parseAmount(/debit\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i);
  const averageBalance =
    parseAmount(/(?:average\s+balance|avg\.?\s+balance|average\s+ledger\s+balance)\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i) ||
    parseAmount(/balance\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i);

  const bouncedTransactions = (lowered.match(/bounce(?:d|s)?|returned|insufficient funds|failed debit/g) || []).length;

  const statementMonthMatches = lowered.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/g) || [];
  const monthsObserved = Math.max(new Set(statementMonthMatches.map((item) => item.trim())).size, 1);

  return {
    accountAverageBalance: averageBalance,
    statementCredits: credits,
    statementDebits: debits,
    bouncedTransactions,
    monthsObserved,
  };
};

const extractLabeledValue = (sourceText, labels) => {
  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = `(?:${escapedLabels.join("|")})`;
  const expression = new RegExp(`${labelPattern}\\s*[:\\-]?\\s*([^\\n|]{2,120})`, "i");
  const match = String(sourceText || "").match(expression);
  return match ? toText(match[1]) : "";
};

const extractCreditHistoryMetrics = (text) => {
  const sourceText = String(text || "");
  const normalized = sourceText
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lowered = normalized.toLowerCase();

  const scoreMatch = lowered.match(/(?:score|bureau score|credit score)\s*[:-]?\s*(\d{3})/i);
  const overdueMatches = lowered.match(/(?:overdue|arrears|delinquent|past due|default)/g) || [];
  const lateMatches = lowered.match(/(?:late payment|missed payment|30 days|60 days|90 days)/g) || [];
  const enquiryMatches = lowered.match(/(?:enquiry|inquiry|searches?)/g) || [];
  const activeAccountsMatch = lowered.match(/(?:accounts?|facilities?)\s*[:-]?\s*(\d+)/i);
  const openLoansMatch = lowered.match(/(?:open loans?|active loans?|existing facilities?)\s*[:-]?\s*(\d+)/i);
  const defaultMatches = lowered.match(/(?:defaulted?|write[-\s]?off|charged off|judgment)/g) || [];
  const outstandingDebtMatch = lowered.match(/(?:total\s+outstanding\s+debt|outstanding\s+debt|total\s+debt)\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i);
  const arrearAmountMatch = lowered.match(/(?:total\s+arrear\s+amount|arrear\s+amount|total\s+arrears?)\s*[:-]?\s*(?:ngn\s*|₦)?([\d,.]+)/i);

  const firstName = extractLabeledValue(sourceText, ["first name", "firstname", "given name"]);
  const lastName = extractLabeledValue(sourceText, ["last name", "surname", "family name"]);
  const fullName = extractLabeledValue(sourceText, ["full name", "customer name", "name"]);
  const latestResidentialAddress = extractLabeledValue(sourceText, [
    "latest residential address",
    "residential address",
    "current address",
    "home address",
    "address",
  ]);

  const fullNameParts = fullName.split(/\s+/).filter(Boolean);
  const inferredFirstName = !firstName && fullNameParts.length ? fullNameParts[0] : "";
  const inferredLastName = !lastName && fullNameParts.length > 1 ? fullNameParts[fullNameParts.length - 1] : "";

  return {
    bureauScore: scoreMatch ? Number(scoreMatch[1]) : null,
    overdueCount: overdueMatches.length,
    latePaymentCount: lateMatches.length,
    enquiryCount: enquiryMatches.length,
    activeAccounts: activeAccountsMatch ? Number(activeAccountsMatch[1]) : null,
    openLoans: openLoansMatch ? Number(openLoansMatch[1]) : null,
    defaultCount: defaultMatches.length,
    totalOutstandingDebt: outstandingDebtMatch ? formatNumber(outstandingDebtMatch[1].replace(/,/g, "")) : null,
    totalArrearAmount: arrearAmountMatch ? formatNumber(arrearAmountMatch[1].replace(/,/g, "")) : null,
    firstName: firstName || inferredFirstName || null,
    lastName: lastName || inferredLastName || null,
    latestResidentialAddress: latestResidentialAddress || null,
    riskFlags: [...new Set([
      ...(overdueMatches.length ? ["Overdue / arrears"] : []),
      ...(lateMatches.length ? ["Late payment"] : []),
      ...(arrearAmountMatch ? ["Arrear amount reported"] : []),
      ...(defaultMatches.length ? ["Default / write-off"] : []),
      ...(enquiryMatches.length > 3 ? ["Multiple bureau enquiries"] : []),
    ])],
    sourceText: normalized,
  };
};

const parseExcelStatement = async (file) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded spreadsheet does not contain any sheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const rowText = rows.map((row) => row.map((cell) => toText(cell)).join(" | ")).join("\n");
  const transactions = extractStatementTransactionsFromRows(rows);
  const metrics = extractStatementMetrics(rowText);
  const analysis = buildStatementAnalysis(transactions, rowText);

  return {
    ...analysis,
    accountAverageBalance: metrics.accountAverageBalance,
    averageMonthlyBalance: analysis.averageMonthlyBalance || metrics.accountAverageBalance,
    statementCredits: analysis.totalCredits || metrics.statementCredits,
    statementDebits: analysis.totalDebits || metrics.statementDebits,
    bouncedTransactions: Math.max(metrics.bouncedTransactions, analysis.bouncedTransactions),
    monthsObserved: metrics.monthsObserved,
  };
};

const parsePdfStatement = async (file) => {
  const { text, rows } = await extractPdfLines(file);
  const transactions = extractStatementTransactionsFromRows(rows);
  const metrics = extractStatementMetrics(text);
  const analysis = buildStatementAnalysis(transactions, text);

  return {
    ...analysis,
    accountAverageBalance: metrics.accountAverageBalance,
    averageMonthlyBalance: analysis.averageMonthlyBalance || metrics.accountAverageBalance,
    statementCredits: analysis.totalCredits || metrics.statementCredits,
    statementDebits: analysis.totalDebits || metrics.statementDebits,
    bouncedTransactions: Math.max(metrics.bouncedTransactions, analysis.bouncedTransactions),
    monthsObserved: metrics.monthsObserved,
  };
};

const parseExcelCreditHistory = async (file) => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("The uploaded spreadsheet does not contain any sheets.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const normalizedRows = rows
    .map((row) => row.map((cell) => toText(cell)).filter(Boolean))
    .filter((row) => row.length > 0);

  const keyValueRows = normalizedRows
    .filter((row) => row.length >= 2)
    .map((row) => `${row[0]}: ${row.slice(1).join(" ")}`);

  const text = [...keyValueRows, ...normalizedRows.map((row) => row.join(" | "))].join("\n");
  return extractCreditHistoryMetrics(text);
};

const parsePdfCreditHistory = async (file) => {
  const { text } = await extractPdfLines(file);
  return extractCreditHistoryMetrics(text);
};

const analyzeCreditHistoryFile = async (file) => {
  const fileName = String(file?.name || "").toLowerCase();

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcelCreditHistory(file);
  }

  if (fileName.endsWith(".pdf")) {
    return parsePdfCreditHistory(file);
  }

  throw new Error("Upload a PDF or Excel credit history file.");
};

const analyzeStatementFile = async (file) => {
  const fileName = String(file?.name || "").toLowerCase();
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcelStatement(file);
  }

  if (fileName.endsWith(".pdf")) {
    return parsePdfStatement(file);
  }

  throw new Error("Upload a PDF or Excel statement file.");
};

const CBA = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { loans, repayments, logout, user } = useContext(DataContext);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [creditDecisionForm, setCreditDecisionForm] = useState({
    applicantName: "",
    requestedAmount: "",
    monthlyIncome: "",
    accountAverageBalance: "",
    statementCredits: "",
    statementDebits: "",
    bouncedTransactions: "",
    monthsObserved: "6",
  });
  const [creditDecisionResult, setCreditDecisionResult] = useState(null);
  const [statementAnalysis, setStatementAnalysis] = useState({ status: "idle", fileName: "", transactions: [] });
  const [creditHistoryAnalysis, setCreditHistoryAnalysis] = useState({ status: "idle", fileName: "", riskFlags: [] });

  const dashboardStats = useMemo(() => {
    const totalCustomers = new Set(
      loans.map((loan) => (typeof loan.customerName === "string" ? loan.customerName.trim() : ""))
    ).size;
    const activeLoans = loans.filter((loan) => {
      const tenor = Number(loan.tenor || 0);
      if (!tenor) return true;
      const loanRepayments = repayments.filter((repayment) => repayment.loanId === loan.id);
      const paidCount = loanRepayments.filter((repayment) => repayment.status === "✅").length;
      return paidCount < tenor;
    }).length;
    const totalLoanValue = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const totalRepaymentValue = repayments.reduce((sum, repayment) => sum + Number(repayment.amount || 0), 0);

    return [
      { label: "Customers", value: totalCustomers },
      { label: "Active loans", value: activeLoans },
      { label: "Loan value", value: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalLoanValue) },
      { label: "Repayment value", value: new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalRepaymentValue) },
    ];
  }, [loans, repayments]);

  const activeDetails = sectionDetails[activeSection] || sectionDetails.dashboard;

  const handleMenuClick = async (item) => {
    if (item.key === "logout") {
      await logout();
      navigate("/login", { replace: true });
      return;
    }

    setActiveSection(item.key);
  };

  const handleCreditDecisionFieldChange = (field) => (event) => {
    const value = event.target.value;
    setCreditDecisionForm((current) => ({ ...current, [field]: value }));
  };

  const handleStatementUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setStatementAnalysis((current) => ({ ...current, status: "loading", fileName: file.name }));

    try {
      const metrics = await analyzeStatementFile(file);
      const recentTransactions = Array.isArray(metrics.transactions) ? metrics.transactions.slice(0, 12) : [];
      setCreditDecisionForm((current) => ({
        ...current,
        accountAverageBalance: metrics.accountAverageBalance ? String(metrics.accountAverageBalance) : current.accountAverageBalance,
        statementCredits: metrics.statementCredits ? String(metrics.statementCredits) : current.statementCredits,
        statementDebits: metrics.statementDebits ? String(metrics.statementDebits) : current.statementDebits,
        bouncedTransactions: String(metrics.bouncedTransactions ?? 0),
        monthsObserved: String(metrics.monthsObserved ?? current.monthsObserved),
      }));
      setStatementAnalysis({
        status: "success",
        fileName: file.name,
        summary: metrics,
        transactions: recentTransactions,
        message: `Parsed ${file.name} and extracted ${metrics.transactionCount || recentTransactions.length || 0} transactions.`,
      });
    } catch (error) {
      setStatementAnalysis({
        status: "error",
        fileName: file.name,
        transactions: [],
        summary: null,
        message: error.message || "Unable to analyze the uploaded file.",
      });
    }
  };

  const handleCreditHistoryUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setCreditHistoryAnalysis((current) => ({ ...current, status: "loading", fileName: file.name }));

    try {
      const metrics = await analyzeCreditHistoryFile(file);
      setCreditHistoryAnalysis({
        status: "success",
        fileName: file.name,
        ...metrics,
        message: `Parsed ${file.name} and extracted credit history signals.`,
      });
    } catch (error) {
      setCreditHistoryAnalysis({
        status: "error",
        fileName: file.name,
        riskFlags: [],
        message: error.message || "Unable to analyze the credit history file.",
      });
    }
  };

  const runCreditDecision = () => {
    const requestedAmount = Number(creditDecisionForm.requestedAmount || 0);
    const monthlyIncome = Number(creditDecisionForm.monthlyIncome || 0);
    const accountAverageBalance = Number(creditDecisionForm.accountAverageBalance || 0);
    const statementCredits = Number(statementAnalysis.summary?.statementCredits ?? creditDecisionForm.statementCredits ?? 0);
    const statementDebits = Number(statementAnalysis.summary?.statementDebits ?? creditDecisionForm.statementDebits ?? 0);
    const bouncedTransactions = Number(statementAnalysis.summary?.bouncedTransactions ?? creditDecisionForm.bouncedTransactions ?? 0);
    const monthsObserved = Math.max(Number(creditDecisionForm.monthsObserved || 0), 1);
    const bureauScore = Number(creditHistoryAnalysis.bureauScore || 0);
    const totalOutstandingDebt = Number(creditHistoryAnalysis.totalOutstandingDebt || 0);
    const totalArrearAmount = Number(creditHistoryAnalysis.totalArrearAmount || 0);
    const creditHistoryPenalties = Number(creditHistoryAnalysis.defaultCount || 0) * 18 + Number(creditHistoryAnalysis.latePaymentCount || 0) * 8 + Number(creditHistoryAnalysis.overdueCount || 0) * 10;

    const affordabilityRatio = monthlyIncome > 0 ? requestedAmount / (monthlyIncome * 3) : 1;
    const balanceCoverage = requestedAmount > 0 ? accountAverageBalance / requestedAmount : 0;
    const netCashFlow = statementCredits - statementDebits;
    const cashFlowRatio = monthlyIncome > 0 ? netCashFlow / (monthlyIncome * monthsObserved) : -1;

    let score = 100;
    score -= Math.min(bouncedTransactions * 12, 36);

    if (affordabilityRatio > 1) score -= 35;
    else if (affordabilityRatio > 0.75) score -= 18;

    if (balanceCoverage < 0.25) score -= 18;
    else if (balanceCoverage < 0.5) score -= 10;

    if (cashFlowRatio < 0) score -= 20;
    else if (cashFlowRatio < 0.15) score -= 10;

    if (bureauScore) {
      if (bureauScore >= 700) score += 15;
      else if (bureauScore >= 650) score += 8;
      else if (bureauScore < 600) score -= 20;
      else score -= 8;
    }

    score -= Math.min(creditHistoryPenalties, 40);

    if (totalArrearAmount > 0) {
      const arrearToIncomeRatio = monthlyIncome > 0 ? totalArrearAmount / monthlyIncome : 1;
      if (arrearToIncomeRatio >= 1) score -= 20;
      else if (arrearToIncomeRatio >= 0.5) score -= 12;
      else score -= 6;
    }

    if (totalOutstandingDebt > 0 && monthlyIncome > 0) {
      const debtToIncomeRatio = totalOutstandingDebt / (monthlyIncome * 12);
      if (debtToIncomeRatio > 2) score -= 15;
      else if (debtToIncomeRatio > 1) score -= 8;
    }

    if (requestedAmount > monthlyIncome * 6) score -= 10;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let decision = "Refer";
    if (score >= 75 && bouncedTransactions <= 1 && cashFlowRatio >= 0.1 && creditHistoryPenalties < 18) {
      decision = "Approve";
    } else if (score < 45 || bouncedTransactions >= 4 || affordabilityRatio > 1.2 || creditHistoryPenalties >= 30) {
      decision = "Decline";
    }

    const reasons = [];
    if (affordabilityRatio > 1) reasons.push("Requested amount is high relative to monthly income.");
    if (balanceCoverage < 0.5) reasons.push("Average account balance is weak compared with requested amount.");
    if (bouncedTransactions > 0) reasons.push("Statement shows bounced transactions.");
    if (cashFlowRatio < 0.15) reasons.push("Net statement cash flow is limited over the observation period.");
    if (bureauScore) reasons.push(`Credit history score is ${bureauScore}.`);
    if (totalOutstandingDebt > 0) reasons.push(`Total outstanding debt is ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalOutstandingDebt)}.`);
    if (totalArrearAmount > 0) reasons.push(`Total arrear amount is ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(totalArrearAmount)}.`);
    if (creditHistoryAnalysis.riskFlags?.length) reasons.push(`Credit history flags: ${creditHistoryAnalysis.riskFlags.join(", ")}.`);
    if (reasons.length === 0) reasons.push("Income, balance, and statement activity are within acceptable range.");

    setCreditDecisionResult({
      applicantName: creditDecisionForm.applicantName.trim() || "Unnamed applicant",
      score,
      decision,
      reasons,
    });
  };

  const accent = theme.palette.mode === "dark" ? "#60a5fa" : "#1e3a8a";
  const muted = theme.palette.mode === "dark" ? "#a3aed0" : "#64748b";
  const borderColor = theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          mb: 2.5,
          borderRadius: 0.75,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(17,28,68,0.92) 0%, rgba(15,23,42,0.94) 100%)"
              : "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Box>
            <Chip
              label="CBA"
              sx={{
                mb: 1.2,
                fontWeight: 700,
                color: theme.palette.mode === "dark" ? "#dbeafe" : "#1e3a8a",
                bgcolor: theme.palette.mode === "dark" ? "rgba(96,165,250,0.16)" : "#e0e7ff",
              }}
            />
            <Typography variant="h5" fontWeight={800} sx={{ color: accent, lineHeight: 1.1 }}>
              CBA Workspace
            </Typography>
            <Typography variant="body2" sx={{ color: muted, mt: 0.75, maxWidth: 760 }}>
              {user?.name ? `${user.name}, ` : ""}use the module menu to move between operational areas.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => handleMenuClick({ key: "logout" })} startIcon={<LogoutIcon />}>
            Log Out
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 0.75,
              border: `1px solid ${borderColor}`,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              position: { lg: "sticky" },
              top: { lg: 16 },
            }}
          >
            <Typography variant="overline" sx={{ color: muted, fontWeight: 700, letterSpacing: 1 }}>
              Module Menu
            </Typography>

            <Stack spacing={1} sx={{ mt: 1.25 }}>
              {menuItems.map((item) => {
                const active = activeSection === item.key;
                const isLogout = item.key === "logout";

                return (
                  <Button
                    key={item.key}
                    onClick={() => handleMenuClick(item)}
                    variant="text"
                    fullWidth
                    sx={{
                      justifyContent: "flex-start",
                      textAlign: "left",
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 0.5,
                      border: `1px solid ${active ? accent : borderColor}`,
                      color: isLogout ? "#b91c1c" : active ? accent : muted,
                      backgroundColor: active
                        ? theme.palette.mode === "dark"
                          ? "rgba(96,165,250,0.14)"
                          : "#eef2ff"
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isLogout
                          ? theme.palette.mode === "dark"
                            ? "rgba(220,38,38,0.14)"
                            : "#fef2f2"
                          : theme.palette.mode === "dark"
                          ? "rgba(96,165,250,0.14)"
                          : "#f8fafc",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ display: "flex", color: isLogout ? "#dc2626" : active ? accent : muted }}>
                        {item.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={active ? 700 : 600}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: muted, display: "block" }}>
                          {item.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </Button>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 0.75,
              border: `1px solid ${borderColor}`,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Typography variant="h6" fontWeight={800} sx={{ color: accent }}>
              {activeDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ color: muted, mt: 0.75, maxWidth: 760 }}>
              {activeDetails.summary}
            </Typography>

            <Box sx={{ mt: 2.5 }}>
              {activeSection === "dashboard" ? (
                <>
                  <Grid container spacing={2}>
                    {dashboardStats.map((stat) => (
                      <Grid key={stat.label} size={{ xs: 12, sm: 6 }}>
                        <Paper
                          sx={{
                            p: 2,
                            borderRadius: 0.75,
                            border: `1px solid ${borderColor}`,
                            backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#f8fbff",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: muted, mb: 0.5 }}>
                            {stat.label}
                          </Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ color: accent }}>
                            {stat.value}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Paper
                    sx={{
                      mt: 2,
                      p: 2.25,
                      borderRadius: 0.75,
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                      What is ready in this workspace
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2" sx={{ color: muted }}>
                        The menu is structured for ledgers, reporting, customers, accounts, loans, and security.
                      </Typography>
                      <Typography variant="body2" sx={{ color: muted }}>
                        Each section can be extended later with forms, tables, approvals, or API-backed workflows.
                      </Typography>
                    </Stack>
                  </Paper>
                </>
              ) : activeSection === "loans-management" ? (
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 0.75,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                    Loan management features
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2" sx={{ color: muted }}>
                      • Track loan applications from submission to approval.
                    </Typography>
                    <Typography variant="body2" sx={{ color: muted }}>
                      • Review disbursement status, tenor, and repayment progress.
                    </Typography>
                    <Typography variant="body2" sx={{ color: muted }}>
                      • Monitor portfolio exposure, overdue accounts, and restructuring needs.
                    </Typography>
                    <Typography variant="body2" sx={{ color: muted }}>
                      • Link loan records to customer profiles, branch data, and officer assignment.
                    </Typography>
                    <Typography variant="body2" sx={{ color: muted }}>
                      • Route applications into credit decision and approval workflows.
                    </Typography>
                  </Stack>
                </Paper>
              ) : activeSection === "credit-decision" ? (
                <Stack spacing={2}>
                  <Paper
                    sx={{
                      p: 2.25,
                      borderRadius: 0.75,
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                      Application data capture
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          component="input"
                          aria-label="Applicant Name"
                          placeholder="Applicant name"
                          value={creditDecisionForm.applicantName}
                          onChange={handleCreditDecisionFieldChange("applicantName")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Requested Amount"
                          placeholder="Requested amount"
                          value={creditDecisionForm.requestedAmount}
                          onChange={handleCreditDecisionFieldChange("requestedAmount")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Monthly Income"
                          placeholder="Monthly income"
                          value={creditDecisionForm.monthlyIncome}
                          onChange={handleCreditDecisionFieldChange("monthlyIncome")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Account Average Balance"
                          placeholder="Account average balance"
                          value={creditDecisionForm.accountAverageBalance}
                          onChange={handleCreditDecisionFieldChange("accountAverageBalance")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box
                          component="label"
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            p: 2,
                            borderRadius: 2,
                            border: `1px dashed ${borderColor}`,
                            backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.28)" : "#f8fafc",
                            cursor: "pointer",
                          }}
                        >
                          <Typography variant="body2" fontWeight={700} sx={{ color: accent }}>
                            Upload statement of account
                          </Typography>
                          <Typography variant="body2" sx={{ color: muted }}>
                            Accepts PDF, XLS, or XLSX files and extracts statement signals automatically.
                          </Typography>
                          <Box
                            component="input"
                            type="file"
                            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleStatementUpload}
                            sx={{ display: "none" }}
                          />
                          <Button variant="outlined" component="span" sx={{ alignSelf: "flex-start" }}>
                            Choose file
                          </Button>
                          {statementAnalysis.fileName && (
                            <Typography variant="caption" sx={{ color: muted }}>
                              Selected file: {statementAnalysis.fileName}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box
                          component="label"
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            p: 2,
                            borderRadius: 2,
                            border: `1px dashed ${borderColor}`,
                            backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.28)" : "#f8fafc",
                            cursor: "pointer",
                          }}
                        >
                          <Typography variant="body2" fontWeight={700} sx={{ color: accent }}>
                            Upload credit history
                          </Typography>
                          <Typography variant="body2" sx={{ color: muted }}>
                            Accepts PDF, XLS, or XLSX files and extracts credit bureau signals automatically.
                          </Typography>
                          <Box
                            component="input"
                            type="file"
                            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleCreditHistoryUpload}
                            sx={{ display: "none" }}
                          />
                          <Button variant="outlined" component="span" sx={{ alignSelf: "flex-start" }}>
                            Choose file
                          </Button>
                          {creditHistoryAnalysis.fileName && (
                            <Typography variant="caption" sx={{ color: muted }}>
                              Selected file: {creditHistoryAnalysis.fileName}
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Statement Credits"
                          placeholder="Statement credits"
                          value={creditDecisionForm.statementCredits}
                          onChange={handleCreditDecisionFieldChange("statementCredits")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Statement Debits"
                          placeholder="Statement debits"
                          value={creditDecisionForm.statementDebits}
                          onChange={handleCreditDecisionFieldChange("statementDebits")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Bounced Transactions"
                          placeholder="Bounced transactions"
                          value={creditDecisionForm.bouncedTransactions}
                          onChange={handleCreditDecisionFieldChange("bouncedTransactions")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                          component="input"
                          type="number"
                          aria-label="Months Observed"
                          placeholder="Months observed"
                          value={creditDecisionForm.monthsObserved}
                          onChange={handleCreditDecisionFieldChange("monthsObserved")}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: "transparent",
                            color: "inherit",
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Button fullWidth variant="contained" onClick={runCreditDecision} sx={{ height: "100%" }}>
                          Analyze Application
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Paper
                    sx={{
                      p: 2.25,
                      borderRadius: 0.75,
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                      Statement of account review
                    </Typography>
                    <Stack spacing={1}>
                      {statementAnalysis.status !== "idle" && (
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              statementAnalysis.status === "error"
                                ? "#b91c1c"
                                : statementAnalysis.status === "success"
                                ? "#166534"
                                : muted,
                            fontWeight: 600,
                          }}
                        >
                          {statementAnalysis.message}
                        </Typography>
                      )}
                    </Stack>

                    {statementAnalysis.summary && (
                      <Grid container spacing={1.5} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Total credit
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.totalCredits || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Total debit
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.totalDebits || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Loan repayments
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.loanRepayments || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Expenses
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.expenses || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Avg monthly deposits
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.averageMonthlyDeposits || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Avg monthly payments
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.averageMonthlyPayments || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Avg monthly balance
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(statementAnalysis.summary.averageMonthlyBalance || 0)}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    )}
                  </Paper>

                  <Paper
                    sx={{
                      p: 2.25,
                      borderRadius: 0.75,
                      border: `1px solid ${borderColor}`,
                      backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                      Credit history review
                    </Typography>
                    <Stack spacing={1}>
                      {creditHistoryAnalysis.status !== "idle" && (
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              creditHistoryAnalysis.status === "error"
                                ? "#b91c1c"
                                : creditHistoryAnalysis.status === "success"
                                ? "#166534"
                                : muted,
                            fontWeight: 600,
                          }}
                        >
                          {creditHistoryAnalysis.message}
                        </Typography>
                      )}
                    </Stack>

                    <Grid container spacing={1.5} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Bureau score
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.bureauScore ?? "N/A"}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Active accounts
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.activeAccounts ?? creditHistoryAnalysis.openLoans ?? "N/A"}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Enquiries
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.enquiryCount ?? 0}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Default flags
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.defaultCount ?? 0}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Total outstanding debt
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.totalOutstandingDebt != null
                              ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(creditHistoryAnalysis.totalOutstandingDebt)
                              : "N/A"}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ color: muted }}>
                            Total arrear amount
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent }}>
                            {creditHistoryAnalysis.totalArrearAmount != null
                              ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(creditHistoryAnalysis.totalArrearAmount)
                              : "N/A"}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {(creditHistoryAnalysis.firstName || creditHistoryAnalysis.lastName || creditHistoryAnalysis.latestResidentialAddress) && (
                      <Grid container spacing={1.5} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              First name
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>
                              {creditHistoryAnalysis.firstName || "N/A"}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Last name
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>
                              {creditHistoryAnalysis.lastName || "N/A"}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <Paper sx={{ p: 1.25, border: `1px solid ${borderColor}`, borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ color: muted }}>
                              Latest residential address
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: accent }}>
                              {creditHistoryAnalysis.latestResidentialAddress || "N/A"}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    )}

                    {creditHistoryAnalysis.riskFlags?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                          Credit history flags
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {creditHistoryAnalysis.riskFlags.map((flag) => (
                            <Chip key={flag} label={flag} sx={{ mb: 1 }} />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>

                  {creditDecisionResult && (
                    <Paper
                      sx={{
                        p: 2.25,
                        borderRadius: 0.75,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                        Decision result
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body2" sx={{ color: muted }}>
                          Applicant: {creditDecisionResult.applicantName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: muted }}>
                          Score: {creditDecisionResult.score}/100
                        </Typography>
                        <Typography variant="body2" sx={{ color: muted }}>
                          Recommendation: {creditDecisionResult.decision}
                        </Typography>
                        <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {creditDecisionResult.reasons.map((reason) => (
                            <Chip key={reason} label={reason} sx={{ fontWeight: 600 }} />
                          ))}
                        </Box>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              ) : (
                <Paper
                  sx={{
                    p: 2.25,
                    borderRadius: 0.75,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.34)" : "#ffffff",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: accent, mb: 1 }}>
                    Next step
                  </Typography>
                  <Typography variant="body2" sx={{ color: muted }}>
                    {activeDetails.highlight}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                    <Chip label="Ready for build-out" sx={{ fontWeight: 700 }} />
                    <Chip label="Module navigation added" sx={{ fontWeight: 700 }} />
                    <Chip label="Protected route" sx={{ fontWeight: 700 }} />
                  </Stack>
                </Paper>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CBA;