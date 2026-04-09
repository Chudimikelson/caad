// src/DataContext.js
import React, { createContext, useEffect, useState, useCallback } from "react";
import * as api from "./api";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [serverAvailable, setServerAvailable] = useState(true);

  // Load initial data: try server, fallback to localStorage
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [serverLoans, serverReps] = await Promise.all([
          api.fetchLoans(),
          api.fetchRepayments(),
        ]);
        if (!mounted) return;
        setLoans(serverLoans || []);
        setRepayments(serverReps || []);
        setServerAvailable(true);
        localStorage.setItem("loans", JSON.stringify(serverLoans || []));
        localStorage.setItem("repayments", JSON.stringify(serverReps || []));
      } catch (err) {
        setServerAvailable(false);
        const rawLoans = localStorage.getItem("loans");
        const rawReps = localStorage.getItem("repayments");
        setLoans(rawLoans ? JSON.parse(rawLoans) : []);
        setRepayments(rawReps ? JSON.parse(rawReps) : []);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // Keep localStorage in sync as a cache
  useEffect(() => {
    localStorage.setItem("loans", JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem("repayments", JSON.stringify(repayments));
  }, [repayments]);

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
        setLoans((prev) => prev.map((l) => (l.id === tempId ? created : l)));
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

  return (
    <DataContext.Provider
      value={{
        loans,
        setLoans,
        repayments,
        setRepayments,
        serverAvailable,
        syncCreateLoan,
        syncUpdateLoan,
        syncDeleteLoan,
        syncCreateRepayment,
        syncUpdateRepayment,
        syncDeleteRepayment,
        syncReplaceUnpaidRepayments,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};