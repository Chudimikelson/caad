// src/api.js
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const TOKEN_KEY = "jwt_token";

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Authentication
export const login = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((data) => {
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data;
  });

export const register = (userData) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  }).then((data) => {
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data;
  });

export const getCurrentUser = () => request("/auth/me");
export const fetchUsers = () => request("/super-admin/users");
export const updateUserRole = (id, role) =>
  request(`/super-admin/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });

// Account Officers (Super Admin)
export const createOfficer = (name, branch) =>
  request("/super-admin/officers", {
    method: "POST",
    body: JSON.stringify({ name, branch }),
  });

export const fetchAllOfficers = () => request("/super-admin/officers");

export const toggleOfficerStatus = (id) =>
  request(`/super-admin/officers/${id}/toggle`, {
    method: "PATCH",
  });

// Get active officers for dropdown
export const fetchActiveOfficers = () => request("/officers/active");

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  return Promise.resolve({ message: "Logged out successfully" });
};

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