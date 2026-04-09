// src/api.js
const BASE_URL = process.env.REACT_APP_API_URL || "http://192.168.18.32:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Loans
export const fetchLoans = () => request("/loans");
export const createLoan = (loan) =>
  request("/loans", { method: "POST", body: JSON.stringify(loan) });
export const updateLoan = (id, loan) =>
  request(`/loans/${id}`, { method: "PUT", body: JSON.stringify(loan) });
export const deleteLoan = (id) =>
  request(`/loans/${id}`, { method: "DELETE" });

// Repayments
export const fetchRepayments = () => request("/repayments");
export const createRepayment = (repayment) =>
  request("/repayments", { method: "POST", body: JSON.stringify(repayment) });
export const updateRepayment = (id, repayment) =>
  request(`/repayments/${id}`, { method: "PUT", body: JSON.stringify(repayment) });
export const deleteRepayment = (id) =>
  request(`/repayments/${id}`, { method: "DELETE" });

// New: replace unpaid repayments for a loan
export const replaceUnpaidRepayments = (loanId, repayments) =>
  request(`/loans/${loanId}/replace-unpaid-repayments`, {
    method: "PUT",
    body: JSON.stringify({ repayments }),
  });