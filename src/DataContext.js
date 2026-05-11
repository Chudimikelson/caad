// src/DataContext.js
import React, { createContext, useEffect, useState, useCallback } from "react";
import * as api from "./api";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // ========== Theme State ==========
  const [themeMode, setThemeMode] = useState(localStorage.getItem("themeMode") || "light");

  // ========== Authentication State ==========
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ========== Loan & Repayment State ==========
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [serverAvailable, setServerAvailable] = useState(true);

  // ========== Account Officers State ==========
  const [officers, setOfficers] = useState([]);
  const [activeOfficers, setActiveOfficers] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);

  // ========== Auto-login on app initialization ==========
  useEffect(() => {
    let mounted = true;

    const autoLogin = async () => {
      const token = localStorage.getItem("jwt_token");
      const savedUser = localStorage.getItem("authUser");

      if (token && savedUser) {
        try {
          // Verify token is still valid
          await api.getCurrentUser();
          if (!mounted) return;
          let userData = JSON.parse(savedUser);
          // Patch: assign default role if missing
          if (!userData.role) userData.role = "Relationship Manager";
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          // Token invalid or expired
          localStorage.removeItem("jwt_token");
          localStorage.removeItem("authUser");
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setAuthLoading(false);
    };

    autoLogin();
    return () => (mounted = false);
  }, []);

  // ========== Load data only when authenticated ==========
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    let mounted = true;

    const load = async () => {
      try {
        const [serverLoans, serverReps, serverLoanTypes] = await Promise.all([
          api.fetchLoans(),
          api.fetchRepayments(),
          api.fetchLoanTypes().catch(() => []),
        ]);
        if (!mounted) return;
        setLoans(serverLoans || []);
        setRepayments(serverReps || []);
        setLoanTypes(serverLoanTypes || []);
        setServerAvailable(true);
        localStorage.setItem("loans", JSON.stringify(serverLoans || []));
        localStorage.setItem("repayments", JSON.stringify(serverReps || []));
      } catch (err) {
        if (!mounted) return;
        setServerAvailable(false);
        const rawLoans = localStorage.getItem("loans");
        const rawReps = localStorage.getItem("repayments");
        setLoans(rawLoans ? JSON.parse(rawLoans) : []);
        setRepayments(rawReps ? JSON.parse(rawReps) : []);
        setLoanTypes([]);
      }
    };

    load();
    return () => (mounted = false);
  }, [isAuthenticated, authLoading]);

  // Keep localStorage in sync as a cache
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("loans", JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem("repayments", JSON.stringify(repayments));
  }, [repayments]);

  // ========== Authentication Functions ==========

  const login = useCallback(async (credentials) => {
    setAuthLoading(true);
    try {
      const response = await api.login(credentials.email, credentials.password);
      const { token, user: userData } = response;

      // Store token and user data
      localStorage.setItem("jwt_token", token);
      localStorage.setItem("authUser", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
      setAuthLoading(false);

      return { success: true, user: userData };
    } catch (err) {
      setAuthLoading(false);
      const errMsg = err.message || "Login failed";
      return { success: false, error: errMsg };
    }
  }, []);

  const register = useCallback(async (credentials) => {
    setAuthLoading(true);
    try {
      const response = await api.register({ name: credentials.name, email: credentials.email, password: credentials.password });
      const { token, user: userData } = response;

      localStorage.setItem("jwt_token", token);
      localStorage.setItem("authUser", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
      setAuthLoading(false);

      return { success: true, user: userData };
    } catch (err) {
      setAuthLoading(false);
      const errMsg = err.message || "Registration failed";
      return { success: false, error: errMsg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Attempt to notify server
      await api.logout();
    } catch (err) {
      // Logout locally even if server call fails
      console.warn("Server logout failed:", err);
    }

    // Clear local state and storage
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("authUser");
    localStorage.removeItem("loans");
    localStorage.removeItem("repayments");

    setUser(null);
    setIsAuthenticated(false);
    setLoans([]);
    setRepayments([]);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((current) => (current === "light" ? "dark" : "light"));
  }, []);

  /* -------------------- Loan helpers -------------------- */

  const syncCreateLoan = useCallback(
    async (loan) => {
      // optimistic: add to local state with temporary id (negative)
      const tempId = Date.now() * -1;
      const optimisticLoan = { ...loan, id: tempId };
      setLoans((prev) => [...prev, optimisticLoan]);

      if (!serverAvailable) return optimisticLoan;

      try {
        const created = await api.createLoan(loan);
        setLoans((prev) => prev.map((l) => l.id === tempId ? created : l));
        return created;
      } catch (err) {
        setLoans((prev) => prev.filter((l) => l.id !== tempId));
        throw err;
      }
    },
    [serverAvailable]
  );

  const syncUpdateLoan = useCallback(
    async (id, updatedLoan) => {
      const prev = loans.find((l) => l.id === id);
      setLoans((prevArr) => prevArr.map((l) => (l.id === id ? { ...updatedLoan } : l)));

      // Sync repayment metadata locally immediately
      setRepayments((prevReps) =>
        prevReps.map((r) =>
          r.loanId === id
            ? {
                ...r,
                customerName: updatedLoan.customerName,
                officer: updatedLoan.officer,
                branch: updatedLoan.branch,
                loanAmount: Number(updatedLoan.amount),
              }
            : r
        )
      );

      if (!serverAvailable) return updatedLoan;

      try {
        const serverLoan = await api.updateLoan(id, updatedLoan);
        setLoans((prevArr) => prevArr.map((l) => (l.id === id ? serverLoan : l)));
        return serverLoan;
      } catch (err) {
        // revert
        setLoans((prevArr) => prevArr.map((l) => (l.id === id ? prev : l)));
        // revert repayments metadata
        setRepayments((prevReps) =>
          prevReps.map((r) =>
            r.loanId === id
              ? {
                  ...r,
                  customerName: prev.customerName,
                  officer: prev.officer,
                  branch: prev.branch,
                  loanAmount: Number(prev.amount),
                }
              : r
          )
        );
        throw err;
      }
    },
    [loans, serverAvailable]
  );

  const syncDeleteLoan = useCallback(
    async (id) => {
      const prevLoans = loans;
      const prevReps = repayments;
      setLoans((prev) => prev.filter((l) => l.id !== id));
      setRepayments((prev) => prev.filter((r) => r.loanId !== id));

      if (!serverAvailable) return;

      try {
        await api.deleteLoan(id);
      } catch (err) {
        setLoans(prevLoans);
        setRepayments(prevReps);
        throw err;
      }
    },
    [loans, repayments, serverAvailable]
  );

  /* -------------------- Repayment helpers -------------------- */

  const syncCreateRepayment = useCallback(
    async (repayment) => {
      const tempId = Date.now() * -1;
      const optimistic = { ...repayment, id: tempId };
      setRepayments((prev) => [...prev, optimistic]);

      if (!serverAvailable) return optimistic;

      try {
        const created = await api.createRepayment(repayment);
        setRepayments((prev) => prev.map((r) => (r.id === tempId ? created : r)));
        return created;
      } catch (err) {
        setRepayments((prev) => prev.filter((r) => r.id !== tempId));
        throw err;
      }
    },
    [serverAvailable]
  );

  const syncUpdateRepayment = useCallback(
    async (id, updated) => {
      const prev = repayments.find((r) => r.id === id);
      setRepayments((prevArr) => prevArr.map((r) => (r.id === id ? { ...updated } : r)));

      if (!serverAvailable) return updated;

      try {
        const serverRep = await api.updateRepayment(id, updated);
        setRepayments((prevArr) => prevArr.map((r) => (r.id === id ? serverRep : r)));
        return serverRep;
      } catch (err) {
        setRepayments((prevArr) => prevArr.map((r) => (r.id === id ? prev : r)));
        throw err;
      }
    },
    [repayments, serverAvailable]
  );

  const syncDeleteRepayment = useCallback(
    async (id) => {
    const prevReps = repayments;
    setRepayments((prev) => prev.filter((r) => r.id !== id));

    if (!serverAvailable) return;

    try {
      await api.deleteRepayment(id);
    } catch (err) {
      setRepayments(prevReps);
      throw err;
    }
  },
  [repayments, serverAvailable]
);

  /* -------------------- Replace unpaid repayments helper -------------------- */

  const syncReplaceUnpaidRepayments = useCallback(
    async (loanId, newReps) => {
      // newReps: array of repayment objects { date, amount, customerName?, loanAmount?, officer?, branch?, status? }
      if (!Array.isArray(newReps)) {
        throw new Error("newReps must be an array");
      }

      // If server not available, perform local fallback: remove unpaid and append new with temp ids
      if (!serverAvailable) {
        setRepayments((prev) => {
          const paid = prev.filter((r) => r.loanId !== loanId || r.status === "✅");
          const tempNew = newReps.map((r) => ({ ...r, id: Date.now() * -1, loanId }));
          return [...paid, ...tempNew];
        });
        return null;
      }

      // Call server endpoint
      try {
        console.log("replace-unpaid payload:", { loanId, newReps });
        const updatedReps = await api.replaceUnpaidRepayments(loanId, newReps);
        console.log("replace-unpaid response:", updatedReps);

        // If server returned an array, merge it
        if (Array.isArray(updatedReps)) {
          setRepayments((prev) => {
            const others = prev.filter((r) => r.loanId !== loanId);
            return [...others, ...updatedReps];
          });
          return updatedReps;
        }

        // If server returned null/empty (204 or no body), fetch fresh rows and merge
        const fresh = await api.fetchRepayments();
        const loanFresh = Array.isArray(fresh) ? fresh.filter((r) => r.loanId === loanId) : [];
        setRepayments((prev) => {
          const others = prev.filter((r) => r.loanId !== loanId);
          return [...others, ...loanFresh];
        });
        return loanFresh;
      } catch (err) {
        console.error("syncReplaceUnpaidRepayments failed:", err);
        throw err;
      }
    },
    [serverAvailable]
  );

  /* -------------------- Relationship Manager helpers -------------------- */

  const syncLoadAllOfficers = useCallback(async () => {
    try {
      const allOfficers = await api.fetchAllOfficers();
      setOfficers(Array.isArray(allOfficers) ? allOfficers : []);
      return allOfficers;
    } catch (err) {
      console.error("Failed to load officers:", err);
      setOfficers([]);
      throw err;
    }
  }, []);

  const syncLoadActiveOfficers = useCallback(async () => {
    try {
      const active = await api.fetchActiveOfficers();
      setActiveOfficers(Array.isArray(active) ? active : []);
      return active;
    } catch (err) {
      console.error("Failed to load active officers:", err);
      setActiveOfficers([]);
      throw err;
    }
  }, []);

  const syncCreateOfficer = useCallback(
    async (payload) => {
      try {
        const newOfficer = await api.createOfficer(payload);
        setOfficers((prev) => [...prev, newOfficer]);
        // Reload active officers list
        await syncLoadActiveOfficers();
        return newOfficer;
      } catch (err) {
        console.error("Failed to create officer:", err);
        throw err;
      }
    },
    [syncLoadActiveOfficers]
  );

  const syncToggleOfficerStatus = useCallback(
    async (id) => {
      const prev = officers.find((o) => o.id === id);
      setOfficers((prevArr) => prevArr.map((o) => (o.id === id ? { ...o, isActive: !o.isActive } : o)));

      try {
        const updated = await api.toggleOfficerStatus(id);
        setOfficers((prevArr) => prevArr.map((o) => (o.id === id ? updated : o)));
        // Reload active officers list
        await syncLoadActiveOfficers();
        return updated;
      } catch (err) {
        // revert
        setOfficers((prevArr) => prevArr.map((o) => (o.id === id ? prev : o)));
        throw err;
      }
    },
    [officers, syncLoadActiveOfficers]
  );

  /* -------------------- Loan Type helpers -------------------- */

  const syncLoadLoanTypes = useCallback(async () => {
    try {
      const types = await api.fetchLoanTypes();
      setLoanTypes(Array.isArray(types) ? types : []);
      return types;
    } catch (err) {
      console.error("Failed to load loan types:", err);
      setLoanTypes([]);
      throw err;
    }
  }, []);

  const syncCreateLoanType = useCallback(async (name, interestRate) => {
    const created = await api.createLoanType({ name, interestRate });
    await syncLoadLoanTypes();
    return created;
  }, [syncLoadLoanTypes]);

  const syncUpdateLoanType = useCallback(async (id, patch) => {
    const updated = await api.updateLoanType(id, patch);
    await syncLoadLoanTypes();
    return updated;
  }, [syncLoadLoanTypes]);

  const syncFetchAllLoanTypes = useCallback(async () => {
    return api.fetchAllLoanTypes();
  }, []);

  const syncFetchRelationshipManagers = useCallback(async () => {
    return api.fetchRelationshipManagers();
  }, []);

  const syncReassignCustomerManager = useCallback(
    async ({ customerName, fromOfficer, toOfficer }) => {
      const result = await api.reassignCustomerManager({ customerName, fromOfficer, toOfficer });

      setLoans((prev) =>
        prev.map((loan) => {
          const customerMatch = loan.customerName === customerName;
          const fromOfficerMatch = !fromOfficer || loan.officer === fromOfficer;
          if (customerMatch && fromOfficerMatch) {
            return { ...loan, officer: toOfficer };
          }
          return loan;
        })
      );

      setRepayments((prev) =>
        prev.map((rep) => {
          const customerMatch = rep.customerName === customerName;
          const fromOfficerMatch = !fromOfficer || rep.officer === fromOfficer;
          if (customerMatch && fromOfficerMatch) {
            return { ...rep, officer: toOfficer };
          }
          return rep;
        })
      );

      return result;
    },
    []
  );

  return (
    <DataContext.Provider
      value={{
        // Theme
        themeMode,
        toggleThemeMode,

        // Authentication
        user,
        isAuthenticated,
        authLoading,
        login,
        logout,

        // Loans & Repayments
        loans,
        setLoans,
        repayments,
        setRepayments,
        serverAvailable,
        syncCreateLoan,
        syncUpdateLoan,
        syncDeleteLoan,
        register,
        syncCreateRepayment,
        syncUpdateRepayment,
        syncDeleteRepayment,
        syncReplaceUnpaidRepayments,

        // Relationship Managers
        officers,
        activeOfficers,
        syncLoadAllOfficers,
        syncLoadActiveOfficers,
        syncCreateOfficer,
        syncToggleOfficerStatus,

        // Loan Types and reassignment
        loanTypes,
        syncLoadLoanTypes,
        syncCreateLoanType,
        syncUpdateLoanType,
        syncFetchAllLoanTypes,
        syncFetchRelationshipManagers,
        syncReassignCustomerManager,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};