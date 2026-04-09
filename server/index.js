// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = process.env.DB_FILE || path.join(__dirname, "data.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open DB:", err);
    process.exit(1);
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Ensure foreign keys are enforced
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT NOT NULL,
      amount REAL NOT NULL,
      interestRate REAL NOT NULL,
      tenor INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      officer TEXT,
      branch TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId INTEGER NOT NULL,
      customerName TEXT,
      loanAmount REAL,
      date TEXT,
      amount REAL,
      officer TEXT,
      branch TEXT,
      status TEXT,
      FOREIGN KEY (loanId) REFERENCES loans(id) ON DELETE CASCADE
    )`
  );
});

// Promise wrappers for sqlite operations
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    })
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    })
  );

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

/* -------------------- Loans -------------------- */

// GET /loans
app.get("/loans", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM loans ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /loans
app.post("/loans", async (req, res) => {
  try {
    const { customerName, amount, interestRate, tenor, startDate, officer, branch } = req.body;
    if (!customerName || amount == null || interestRate == null || tenor == null || !startDate) {
      return res.status(400).json({ error: "Missing required loan fields" });
    }
    const result = await run(
      `INSERT INTO loans (customerName, amount, interestRate, tenor, startDate, officer, branch)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customerName, amount, interestRate, tenor, startDate, officer || null, branch || null]
    );
    const loan = await get("SELECT * FROM loans WHERE id = ?", [result.id]);
    res.status(201).json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /loans/:id
app.put("/loans/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { customerName, amount, interestRate, tenor, startDate, officer, branch } = req.body;
    await run(
      `UPDATE loans SET customerName=?, amount=?, interestRate=?, tenor=?, startDate=?, officer=?, branch=? WHERE id=?`,
      [customerName, amount, interestRate, tenor, startDate, officer || null, branch || null, id]
    );
    const loan = await get("SELECT * FROM loans WHERE id = ?", [id]);
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /loans/:id
app.delete("/loans/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    // Delete repayments first to be safe (cascade may not be enabled in all builds)
    await run("DELETE FROM repayments WHERE loanId = ?", [id]);
    const result = await run("DELETE FROM loans WHERE id = ?", [id]);
    if (result.changes === 0) return res.status(404).json({ error: "Loan not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- Repayments -------------------- */

// GET /repayments
app.get("/repayments", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM repayments ORDER BY id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /repayments
app.post("/repayments", async (req, res) => {
  try {
    const { loanId, customerName, loanAmount, date, amount, officer, branch, status } = req.body;
    if (!loanId || !date || amount == null) {
      return res.status(400).json({ error: "Missing required repayment fields" });
    }
    const result = await run(
      `INSERT INTO repayments (loanId, customerName, loanAmount, date, amount, officer, branch, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [loanId, customerName || null, loanAmount || null, date, amount, officer || null, branch || null, status || null]
    );
    const repayment = await get("SELECT * FROM repayments WHERE id = ?", [result.id]);
    res.status(201).json(repayment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /repayments/:id
app.put("/repayments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { loanId, customerName, loanAmount, date, amount, officer, branch, status } = req.body;
    await run(
      `UPDATE repayments SET loanId=?, customerName=?, loanAmount=?, date=?, amount=?, officer=?, branch=?, status=? WHERE id=?`,
      [loanId, customerName || null, loanAmount || null, date, amount, officer || null, branch || null, status || null, id]
    );
    const repayment = await get("SELECT * FROM repayments WHERE id = ?", [id]);
    if (!repayment) return res.status(404).json({ error: "Repayment not found" });
    res.json(repayment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /repayments/:id
app.delete("/repayments/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await run("DELETE FROM repayments WHERE id = ?", [id]);
    if (result.changes === 0) return res.status(404).json({ error: "Repayment not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- New endpoint: replace unpaid repayments for a loan --------------------
   PUT /loans/:id/replace-unpaid-repayments
   Body: { repayments: [ { date, amount, customerName, loanAmount, officer, branch, status? }, ... ] }
   Behavior:
     - In a transaction: delete all repayments for loanId where status IS NOT '✅' (unpaid or other)
     - Insert the provided repayments (they should include date and amount)
     - Return the full list of repayments for that loan after the operation
*/
app.put("/loans/:id/replace-unpaid-repayments", async (req, res) => {
  const id = Number(req.params.id);
  const { repayments: newReps } = req.body;

  if (!Array.isArray(newReps)) {
    return res.status(400).json({ error: "repayments must be an array" });
  }

  for (const r of newReps) {
    if (!r.date || r.amount == null) {
      return res.status(400).json({ error: "Each repayment must include date and amount" });
    }
  }

  db.serialize(async () => {
    try {
      await run("BEGIN TRANSACTION");

      const loan = await get("SELECT * FROM loans WHERE id = ?", [id]);
      if (!loan) {
        await run("ROLLBACK");
        return res.status(404).json({ error: "Loan not found" });
      }

      // Delete unpaid repayments (status IS NULL or status != '✅')
      await run("DELETE FROM repayments WHERE loanId = ? AND (status IS NULL OR status != '✅')", [id]);

      // Insert new repayments
      for (const r of newReps) {
        const { date, amount, customerName, loanAmount, officer, branch, status } = r;
        await run(
          `INSERT INTO repayments (loanId, customerName, loanAmount, date, amount, officer, branch, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, customerName || null, loanAmount || null, date, amount, officer || null, branch || null, status || null]
        );
      }

      await run("COMMIT");

      const updated = await all("SELECT * FROM repayments WHERE loanId = ? ORDER BY date, id", [id]);
      res.json(updated);
    } catch (err) {
      try {
        await run("ROLLBACK");
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      res.status(500).json({ error: err.message });
    }
  });
});

/* -------------------- Start server -------------------- */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
