import React, { useContext, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import { bulkUpdateCustomerAccountNumbers } from "../api";
import { DataContext } from "../DataContext";

const HEADER_ALIASES = {
  customerName: ["customername", "customer", "name", "customer_name", "customer name"],
  accountNumber: ["accountnumber", "accountno", "account", "account_no", "account number", "account no"],
};

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeCustomerNameKey = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const findHeaderKey = (headers, aliases) => {
  const byNormalized = new Map(headers.map((h) => [normalizeHeader(h), h]));
  for (const alias of aliases) {
    const found = byNormalized.get(normalizeHeader(alias));
    if (found) return found;
  }
  return null;
};

const parseExcelRows = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The workbook has no sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("No data rows were found in the first worksheet.");
  }

  const headers = Array.from(new Set(rawRows.flatMap((row) => Object.keys(row || {}))));
  const customerHeader = findHeaderKey(headers, HEADER_ALIASES.customerName);
  const accountHeader = findHeaderKey(headers, HEADER_ALIASES.accountNumber);

  if (!customerHeader || !accountHeader) {
    throw new Error("Missing required columns. Add customer name and account number headers.");
  }

  return rawRows
    .map((row, index) => {
      const customerName = String(row?.[customerHeader] || "").trim().replace(/\s+/g, " ");
      const accountNumber = String(row?.[accountHeader] || "").trim();
      return {
        customerName,
        accountNumber,
        rowNumber: index + 2,
      };
    })
    .filter((row) => row.customerName && row.accountNumber);
};

const CustomerManagement = () => {
  const { loans } = useContext(DataContext);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState(null);

  const existingCustomerMap = useMemo(() => {
    const map = new Map();
    (loans || []).forEach((loan) => {
      const rawName = String(loan?.customerName || "").trim().replace(/\s+/g, " ");
      const key = normalizeCustomerNameKey(rawName);
      if (rawName && key && !map.has(key)) {
        map.set(key, rawName);
      }
    });
    return map;
  }, [loans]);

  const previewRows = useMemo(() => parsedRows.slice(0, 10), [parsedRows]);

  const handleSelectFile = async (event) => {
    const file = event.target.files?.[0];
    setErrorMessage("");
    setResult(null);
    setSkippedRows([]);

    if (!file) return;

    try {
      const rows = await parseExcelRows(file);

      const matchedRows = [];
      const unmatched = [];

      rows.forEach((row) => {
        const key = normalizeCustomerNameKey(row.customerName);
        const canonicalCustomerName = existingCustomerMap.get(key);

        if (!canonicalCustomerName) {
          unmatched.push(row);
          return;
        }

        matchedRows.push({
          ...row,
          customerName: canonicalCustomerName,
        });
      });

      if (!matchedRows.length) {
        throw new Error("No uploaded customer names matched existing customers. Nothing to upload.");
      }

      setSelectedFileName(file.name);
      setParsedRows(matchedRows);
      setSkippedRows(unmatched);
    } catch (err) {
      setSelectedFileName("");
      setParsedRows([]);
      setSkippedRows([]);
      setErrorMessage(err.message || "Failed to parse the selected Excel file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleUpload = async () => {
    if (!parsedRows.length) {
      setErrorMessage("Select a valid Excel file before uploading.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      const response = await bulkUpdateCustomerAccountNumbers(parsedRows);
      setResult(response);
    } catch (err) {
      setErrorMessage(err.message || "Bulk update failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} mb={2} color="#1e3a8a">
        Customer Management
      </Typography>

      <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)", mb: 2.5 }}>
        <Stack spacing={1.2}>
          <Typography variant="h6">Bulk Update Account Numbers</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload an Excel file with two columns: customer name and account number. Example headers: Customer Name, Account Number.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
              Select Excel File
              <input type="file" hidden accept=".xlsx,.xls" onChange={handleSelectFile} />
            </Button>
            <Button
              variant="contained"
              startIcon={processing ? <CircularProgress color="inherit" size={16} /> : <SaveIcon />}
              disabled={processing || !parsedRows.length}
              onClick={handleUpload}
            >
              {processing ? "Updating..." : "Upload and Update"}
            </Button>
          </Stack>

          {selectedFileName && (
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip color="primary" variant="outlined" label={`${selectedFileName}`} />
                <Chip color="success" variant="outlined" label={`Matched rows: ${parsedRows.length}`} />
                <Chip color="warning" variant="outlined" label={`Skipped rows: ${skippedRows.length}`} />
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {errorMessage}
        </Alert>
      )}

      {skippedRows.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {skippedRows.length} row(s) were skipped because customer names were not found in existing customer records.
        </Alert>
      )}

      {previewRows.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)", mb: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Preview (first 10 rows)</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Account Number</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((row) => (
                  <TableRow key={`${row.rowNumber}-${row.customerName}-${row.accountNumber}`}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.accountNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {result && (
        <Paper sx={{ p: 2.5, borderRadius: 0.5, border: "1px solid #e2e8f0", boxShadow: "0 10px 24px rgba(15,23,42,0.08)" }}>
          <Typography variant="h6" sx={{ mb: 1.2 }}>Update Summary</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
            <Chip color="info" label={`Rows received: ${result.totalRows || 0}`} />
            <Chip color="info" label={`Valid rows: ${result.validRows || 0}`} />
            <Chip color="info" label={`Matched rows: ${result.matchedRows || 0}`} />
            <Chip color="success" label={`Customers updated: ${result.updatedCustomers || 0}`} />
            <Chip color="warning" label={`No change: ${result.unchangedCustomers || 0}`} />
            <Chip color="default" label={`Unmatched: ${result.unmatchedCustomers || 0}`} />
          </Stack>

          {(result.conflictingCustomers || []).length > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Conflicting account numbers found for: {(result.conflictingCustomers || []).join(", ")}
            </Alert>
          )}

          {(result.unmatchedCustomerNames || []).length > 0 && (
            <>
              <Divider sx={{ mb: 1.5 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Customers not found in existing records:</Typography>
              <Typography variant="body2" color="text.secondary">
                {(result.unmatchedCustomerNames || []).join(", ")}
              </Typography>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CustomerManagement;