// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

/* ==================== MongoDB Connection ==================== */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/caad";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ROLES = ["Super Admin", "Credit Admin", "Relationship Manager", "Supervisor"];

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using fallback secret.");
}

// Seed Super Admin if not present
const seedSuperAdmin = async () => {
  const email = "osellezino@gmail.com";
  const password = "blackgene";
  const name = "Chudi";
  const role = "Super Admin";
  const existing = await User.findOne({ email });
  if (existing) {
    let shouldSave = false;

    if (existing.name !== name) {
      existing.name = name;
      shouldSave = true;
    }

    if (existing.role !== role) {
      existing.role = role;
      shouldSave = true;
    }

    if (shouldSave) {
      await existing.save();
      console.log("Super Admin account repaired.");
    }

    return;
  }

  const bcryptjs = require("bcryptjs");
  const salt = await bcryptjs.genSalt(10);
  const hashed = await bcryptjs.hash(password, salt);
  const user = new User({ name, email, password: hashed, role });
  await user.save();
  console.log("Super Admin seeded.");
};

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log("Connected to MongoDB");
    mongoose.connection.once("open", seedSuperAdmin);
    app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
      const routes = (app.router?.stack || [])
        .map((layer) => layer.route?.path)
        .filter(Boolean);
      console.log("Registered routes:", routes);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });

/* ==================== Mongoose Schemas & Models ==================== */

// User Schema for authentication
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ROLES,
    default: "Relationship Manager",
    required: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  // Account Officer fields (only used if user is an account officer)
  accountOfficer: {
    name: String,
    branch: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

// Loan Schema
const loanSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
  },
  loanType: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  },
  tenor: {
    type: Number,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  officer: String,
  branch: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Loan = mongoose.model("Loan", loanSchema);

// Loan Type Schema
const loanTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const LoanType = mongoose.model("LoanType", loanTypeSchema);

// Branch Schema
const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Branch = mongoose.model("Branch", branchSchema);

// Repayment Schema
const repaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Loan",
    required: true,
  },
  customerName: String,
  loanAmount: Number,
  date: String,
  amount: {
    type: Number,
    required: true,
  },
  officer: String,
  branch: String,
  status: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Repayment = mongoose.model("Repayment", repaymentSchema);

/* ==================== Authentication Middleware ==================== */
const authRequired = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!["Credit Admin", "Super Admin"].includes(req.userRole)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.userRole !== "Super Admin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }
  next();
};

const normalizeManagerName = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const resolveRelationshipManagerNames = async (userId) => {
  const currentUser = await User.findById(userId).select("name accountOfficer.name");
  if (!currentUser) return [];

  const managerNames = new Set();
  const addNameVariant = (name) => {
    const normalized = normalizeManagerName(name);
    if (!normalized) return;
    managerNames.add(normalized);

    // Some seeded officer names include "(Officer)" while loan records may store plain names.
    const withoutOfficerSuffix = normalized.replace(/\s*\(Officer\)$/i, "").trim();
    if (withoutOfficerSuffix) {
      managerNames.add(withoutOfficerSuffix);
    }
  };

  addNameVariant(currentUser.name);
  addNameVariant(currentUser.accountOfficer?.name);

  return Array.from(managerNames);
};


/* ==================== Health Check ==================== */

app.get("/health", (req, res) => res.json({ ok: true }));

/* ==================== Authentication Endpoints ==================== */

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // All new users are Relationship Manager by default
    const user = new User({ name, email, password, role: "Relationship Manager" });
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: "User account is suspended" });
    }

    const match = await bcryptjs.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/me
app.get("/auth/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/super-admin/users", authRequired, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find({}, "_id name email role isSuspended createdAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/super-admin/users/:id/role", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, select: "_id name email role isSuspended createdAt" }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/users/:id/reset-password
app.put("/super-admin/users/:id/reset-password", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "newPassword must be at least 6 characters" });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    target.password = newPassword;
    await target.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /super-admin/users/:id/suspend
app.patch("/super-admin/users/:id/suspend", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    if (typeof isSuspended !== "boolean") {
      return res.status(400).json({ error: "isSuspended must be boolean" });
    }

    if (String(req.userId) === String(id)) {
      return res.status(400).json({ error: "You cannot suspend your own account" });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { isSuspended },
      { new: true, select: "_id name email role isSuspended createdAt" }
    );

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Account Officer Routes (Super Admin Only) ==================== */

// POST /super-admin/officers - Create account officer
app.post("/super-admin/officers", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { name, branch } = req.body;

    if (!name || !branch) {
      return res.status(400).json({ error: "Name and branch are required" });
    }

    const officer = new User({
      name: `${name} (Officer)`,
      email: `officer.${Date.now()}@caad.internal`,
      password: "tempPassword123",
      role: "Relationship Manager",
      accountOfficer: {
        name,
        branch,
        isActive: true,
      },
    });

    await officer.save();

    res.status(201).json({
      id: officer._id,
      name: officer.accountOfficer.name,
      branch: officer.accountOfficer.branch,
      isActive: officer.accountOfficer.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /super-admin/officers - Get all account officers
app.get("/super-admin/officers", authRequired, superAdminOnly, async (req, res) => {
  try {
    const officers = await User.find(
      { "accountOfficer.name": { $exists: true, $ne: null } },
      "_id accountOfficer createdAt"
    ).sort({ createdAt: -1 });

    const result = officers.map(o => ({
      id: o._id,
      name: o.accountOfficer.name,
      branch: o.accountOfficer.branch,
      isActive: o.accountOfficer.isActive,
      createdAt: o.createdAt,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /super-admin/officers/:id/toggle - Toggle officer active status
app.patch("/super-admin/officers/:id/toggle", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid officer ID" });
    }

    const officer = await User.findById(id);

    if (!officer || !officer.accountOfficer || !officer.accountOfficer.name) {
      return res.status(404).json({ error: "Officer not found" });
    }

    officer.accountOfficer.isActive = !officer.accountOfficer.isActive;
    await officer.save();

    res.json({
      id: officer._id,
      name: officer.accountOfficer.name,
      branch: officer.accountOfficer.branch,
      isActive: officer.accountOfficer.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /officers/active - Get active officers only (for dropdowns)
app.get("/officers/active", authRequired, async (req, res) => {
  try {
    const officers = await User.find(
      { "accountOfficer.name": { $exists: true, $ne: null }, "accountOfficer.isActive": true },
      "accountOfficer.name accountOfficer.branch"
    ).sort({ "accountOfficer.name": 1 });

    const result = officers.map(o => ({
      id: o._id,
      name: o.accountOfficer.name,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Loan Type Routes ==================== */

// GET /loan-types - active loan types for admin loan creation
app.get("/loan-types", authRequired, async (req, res) => {
  try {
    const loanTypes = await LoanType.find({ isActive: true }, "_id name interestRate isActive")
      .sort({ name: 1 });

    res.json(
      loanTypes.map((lt) => ({
        id: lt._id.toString(),
        _id: lt._id.toString(),
        name: lt.name,
        interestRate: lt.interestRate,
        isActive: lt.isActive,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /super-admin/loan-types
app.get("/super-admin/loan-types", authRequired, superAdminOnly, async (req, res) => {
  try {
    const loanTypes = await LoanType.find({}, "_id name interestRate isActive createdAt").sort({ createdAt: -1 });
    res.json(
      loanTypes.map((lt) => ({
        id: lt._id.toString(),
        _id: lt._id.toString(),
        name: lt.name,
        interestRate: lt.interestRate,
        isActive: lt.isActive,
        createdAt: lt.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /super-admin/loan-types
app.post("/super-admin/loan-types", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { name, interestRate } = req.body;
    if (!name || interestRate == null) {
      return res.status(400).json({ error: "Name and interestRate are required" });
    }

    const normalizedName = String(name).trim();
    if (!normalizedName) {
      return res.status(400).json({ error: "Loan type name cannot be empty" });
    }

    const rate = Number(interestRate);
    if (Number.isNaN(rate) || rate < 0) {
      return res.status(400).json({ error: "interestRate must be a non-negative number" });
    }

    const existing = await LoanType.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ error: "Loan type already exists" });
    }

    const created = await LoanType.create({ name: normalizedName, interestRate: rate, isActive: true });
    res.status(201).json({
      id: created._id.toString(),
      _id: created._id.toString(),
      name: created.name,
      interestRate: created.interestRate,
      isActive: created.isActive,
      createdAt: created.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/loan-types/:id
app.put("/super-admin/loan-types/:id", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { interestRate, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid loan type ID" });
    }

    const patch = {};
    if (interestRate != null) {
      const rate = Number(interestRate);
      if (Number.isNaN(rate) || rate < 0) {
        return res.status(400).json({ error: "interestRate must be a non-negative number" });
      }
      patch.interestRate = rate;
    }
    if (typeof isActive === "boolean") {
      patch.isActive = isActive;
    }

    const updated = await LoanType.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Loan type not found" });
    }

    res.json({
      id: updated._id.toString(),
      _id: updated._id.toString(),
      name: updated.name,
      interestRate: updated.interestRate,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /super-admin/relationship-managers - names for reassignment
app.get("/super-admin/relationship-managers", authRequired, superAdminOnly, async (req, res) => {
  try {
    const rmUsers = await User.find({ role: "Relationship Manager" }, "name").sort({ name: 1 });
    const officerUsers = await User.find(
      { "accountOfficer.name": { $exists: true, $ne: null }, "accountOfficer.isActive": true },
      "accountOfficer.name"
    ).sort({ "accountOfficer.name": 1 });

    const names = Array.from(
      new Set([
        ...rmUsers.map((u) => (u.name || "").trim()).filter(Boolean),
        ...officerUsers.map((u) => (u.accountOfficer?.name || "").trim()).filter(Boolean),
      ])
    ).sort((a, b) => a.localeCompare(b));

    res.json(names);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/customers/reassign-manager
app.put("/super-admin/customers/reassign-manager", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { customerName, fromOfficer, toOfficer } = req.body;
    if (!customerName || !toOfficer) {
      return res.status(400).json({ error: "customerName and toOfficer are required" });
    }

    const loanFilter = { customerName: String(customerName).trim() };
    const repaymentFilter = { customerName: String(customerName).trim() };

    if (fromOfficer) {
      loanFilter.officer = fromOfficer;
      repaymentFilter.officer = fromOfficer;
    }

    const [loanResult, repaymentResult] = await Promise.all([
      Loan.updateMany(loanFilter, { $set: { officer: toOfficer } }),
      Repayment.updateMany(repaymentFilter, { $set: { officer: toOfficer } }),
    ]);

    res.json({
      message: "Customer reassigned successfully",
      loansUpdated: loanResult.modifiedCount || 0,
      repaymentsUpdated: repaymentResult.modifiedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Branch Management Routes ==================== */

// GET /branches - active branch catalog for all authenticated users
app.get("/branches", authRequired, async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }, "_id name isActive createdAt").sort({ name: 1 });
    res.json(
      branches.map((b) => ({
        id: b._id.toString(),
        _id: b._id.toString(),
        name: b.name,
        isActive: b.isActive,
        createdAt: b.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /super-admin/branches
app.get("/super-admin/branches", authRequired, superAdminOnly, async (req, res) => {
  try {
    // Build branch list from existing records (loans, repayments, officers) and persist missing ones.
    const [storedBranches, loanBranches, repaymentBranches, officerBranches] = await Promise.all([
      Branch.find({}, "_id name isActive createdAt"),
      Loan.distinct("branch", { branch: { $exists: true, $nin: [null, ""] } }),
      Repayment.distinct("branch", { branch: { $exists: true, $nin: [null, ""] } }),
      User.distinct("accountOfficer.branch", { "accountOfficer.branch": { $exists: true, $nin: [null, ""] } }),
    ]);

    const normalize = (val) => String(val || "").trim();

    const byKey = new Map();
    storedBranches.forEach((b) => {
      const name = normalize(b.name);
      if (!name) return;
      byKey.set(name.toLowerCase(), {
        id: b._id.toString(),
        _id: b._id.toString(),
        name,
        isActive: b.isActive,
        createdAt: b.createdAt,
      });
    });

    const discovered = [...loanBranches, ...repaymentBranches, ...officerBranches]
      .map(normalize)
      .filter(Boolean);

    const missingNames = new Set();
    discovered.forEach((name) => {
      const key = name.toLowerCase();
      if (!byKey.has(key)) {
        missingNames.add(name);
      }
    });

    if (missingNames.size > 0) {
      const names = Array.from(missingNames);
      await Promise.all(
        names.map((name) =>
          Branch.updateOne(
            { name },
            { $setOnInsert: { name, isActive: true } },
            { upsert: true }
          )
        )
      );

      const inserted = await Branch.find({ name: { $in: names } }, "_id name isActive createdAt");
      inserted.forEach((b) => {
        const name = normalize(b.name);
        byKey.set(name.toLowerCase(), {
          id: b._id.toString(),
          _id: b._id.toString(),
          name,
          isActive: b.isActive,
          createdAt: b.createdAt,
        });
      });
    }

    const branches = Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(
      branches.map((b) => ({
        id: b.id,
        _id: b._id,
        name: b.name,
        isActive: b.isActive,
        createdAt: b.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /super-admin/branches
app.post("/super-admin/branches", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      return res.status(400).json({ error: "Branch name is required" });
    }

    const existing = await Branch.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ error: "Branch already exists" });
    }

    const created = await Branch.create({ name: normalizedName, isActive: true });
    res.status(201).json({
      id: created._id.toString(),
      _id: created._id.toString(),
      name: created.name,
      isActive: created.isActive,
      createdAt: created.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/branches/:id
app.put("/super-admin/branches/:id", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid branch ID" });
    }

    const normalizedName = String(name || "").trim();
    if (!normalizedName) {
      return res.status(400).json({ error: "Branch name is required" });
    }

    const existingBranch = await Branch.findById(id);
    if (!existingBranch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const previousName = String(existingBranch.name || "").trim();

    const conflicting = await Branch.findOne({
      _id: { $ne: id },
      name: normalizedName,
    });
    if (conflicting) {
      return res.status(409).json({ error: "Another branch already uses this name" });
    }

    const updated = await Branch.findByIdAndUpdate(id, { name: normalizedName }, { new: true });

    // Propagate branch rename to all existing records so only the new name appears across the app.
    if (previousName && previousName !== normalizedName) {
      await Promise.all([
        Loan.updateMany({ branch: previousName }, { $set: { branch: normalizedName } }),
        Repayment.updateMany({ branch: previousName }, { $set: { branch: normalizedName } }),
        User.updateMany(
          { "accountOfficer.branch": previousName },
          { $set: { "accountOfficer.branch": normalizedName } }
        ),
      ]);
    }

    res.json({
      id: updated._id.toString(),
      _id: updated._id.toString(),
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/customers/assign-branch
app.put("/super-admin/customers/assign-branch", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { customerName, branch } = req.body;

    if (!customerName || !branch) {
      return res.status(400).json({ error: "customerName and branch are required" });
    }

    const [loanResult, repaymentResult] = await Promise.all([
      Loan.updateMany({ customerName: String(customerName).trim() }, { $set: { branch } }),
      Repayment.updateMany({ customerName: String(customerName).trim() }, { $set: { branch } }),
    ]);

    res.json({
      message: "Customer branch assigned",
      loansUpdated: loanResult.modifiedCount || 0,
      repaymentsUpdated: repaymentResult.modifiedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /super-admin/officers/assign-branch
app.put("/super-admin/officers/assign-branch", authRequired, superAdminOnly, async (req, res) => {
  try {
    const { officerName, branch } = req.body;

    if (!officerName || !branch) {
      return res.status(400).json({ error: "officerName and branch are required" });
    }

    const officer = await User.findOne({ "accountOfficer.name": officerName });
    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    officer.accountOfficer.branch = branch;
    await officer.save();

    await Promise.all([
      Loan.updateMany({ officer: officerName }, { $set: { branch } }),
      Repayment.updateMany({ officer: officerName }, { $set: { branch } }),
    ]);

    res.json({ message: "Officer branch assigned" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Loans Routes (Protected) ==================== */

// GET /loans
app.get("/loans", authRequired, async (req, res) => {
  try {
    let query = {};

    if (req.userRole === "Relationship Manager") {
      const managerNames = await resolveRelationshipManagerNames(req.userId);
      if (!managerNames.length) {
        return res.json([]);
      }

      query = { officer: { $in: managerNames } };
    }

    const loans = await Loan.find(query).sort({ createdAt: -1 });
    const loansWithStringIds = loans.map(loan => ({
      ...loan.toObject(),
      id: loan._id.toString(),
      _id: loan._id.toString(),
    }));
    res.json(loansWithStringIds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /loans (admin only)
app.post("/loans", authRequired, adminOnly, async (req, res) => {
  try {
    const { customerName, amount, interestRate, loanType, tenor, startDate, officer, branch } = req.body;

    let resolvedInterestRate = interestRate;
    if (loanType) {
      const matchedType = await LoanType.findOne({ name: String(loanType).trim() });
      if (!matchedType) {
        return res.status(400).json({ error: "Invalid loan type" });
      }
      resolvedInterestRate = matchedType.interestRate;
    }

    if (!customerName || amount == null || resolvedInterestRate == null || tenor == null || !startDate) {
      return res.status(400).json({ error: "Missing required loan fields" });
    }

    const loan = new Loan({
      customerName,
      loanType: loanType || undefined,
      amount,
      interestRate: Number(resolvedInterestRate),
      tenor,
      startDate,
      officer: officer || undefined,
      branch: branch || undefined,
    });
    await loan.save();

    res.status(201).json({
      ...loan.toObject(),
      id: loan._id.toString(),
      _id: loan._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /loans/:id (admin only)
app.put("/loans/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, amount, interestRate, loanType, tenor, startDate, officer, branch } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid loan ID" });
    }

    let resolvedInterestRate = interestRate;
    if (loanType) {
      const matchedType = await LoanType.findOne({ name: String(loanType).trim() });
      if (!matchedType) {
        return res.status(400).json({ error: "Invalid loan type" });
      }
      resolvedInterestRate = matchedType.interestRate;
    }

    const loan = await Loan.findByIdAndUpdate(
      id,
      {
        customerName,
        loanType: loanType || undefined,
        amount,
        interestRate: Number(resolvedInterestRate),
        tenor,
        startDate,
        officer: officer || undefined,
        branch: branch || undefined,
      },
      { new: true }
    );

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    res.json({
      ...loan.toObject(),
      id: loan._id.toString(),
      _id: loan._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /loans/:id (admin only)
app.delete("/loans/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid loan ID" });
    }

    // Delete all repayments for this loan
    await Repayment.deleteMany({ loanId: id });

    // Delete the loan
    const result = await Loan.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Loan not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Repayments Routes (Protected) ==================== */

// GET /repayments
app.get("/repayments", authRequired, async (req, res) => {
  try {
    let query = {};

    if (req.userRole === "Relationship Manager") {
      const managerNames = await resolveRelationshipManagerNames(req.userId);
      if (!managerNames.length) {
        return res.json([]);
      }

      const managerLoans = await Loan.find({ officer: { $in: managerNames } }).select("_id");
      const managerLoanIds = managerLoans.map((loan) => loan._id);

      const orFilters = [{ officer: { $in: managerNames } }];
      if (managerLoanIds.length) {
        orFilters.push({ loanId: { $in: managerLoanIds } });
      }

      query = { $or: orFilters };
    }

    const repayments = await Repayment.find(query).sort({ createdAt: -1 });
    const repaymentWithStringIds = repayments.map(rep => ({
      ...rep.toObject(),
      id: rep._id.toString(),
      _id: rep._id.toString(),
      loanId: rep.loanId.toString(),
    }));
    res.json(repaymentWithStringIds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /repayments (admin only)
app.post("/repayments", authRequired, adminOnly, async (req, res) => {
  try {
    const { loanId, customerName, loanAmount, date, amount, officer, branch, status } = req.body;
    if (!loanId || !date || amount == null) {
      return res.status(400).json({ error: "Missing required repayment fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return res.status(400).json({ error: "Invalid loan ID" });
    }

    // Verify loan exists
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const repayment = new Repayment({
      loanId,
      customerName: customerName || undefined,
      loanAmount: loanAmount || undefined,
      date,
      amount,
      officer: officer || undefined,
      branch: branch || undefined,
      status: status || undefined,
    });
    await repayment.save();

    res.status(201).json({
      ...repayment.toObject(),
      id: repayment._id.toString(),
      _id: repayment._id.toString(),
      loanId: repayment.loanId.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /repayments/:id (admin only)
app.put("/repayments/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { loanId, customerName, loanAmount, date, amount, officer, branch, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repayment ID" });
    }

    const repayment = await Repayment.findByIdAndUpdate(
      id,
      {
        loanId,
        customerName: customerName || undefined,
        loanAmount: loanAmount || undefined,
        date,
        amount,
        officer: officer || undefined,
        branch: branch || undefined,
        status: status || undefined,
      },
      { new: true }
    );

    if (!repayment) {
      return res.status(404).json({ error: "Repayment not found" });
    }

    res.json({
      ...repayment.toObject(),
      id: repayment._id.toString(),
      _id: repayment._id.toString(),
      loanId: repayment.loanId.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /repayments/:id (admin only)
app.delete("/repayments/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repayment ID" });
    }

    const result = await Repayment.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Repayment not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Replace Unpaid Repayments (MongoDB Transaction) ==================== */

// PUT /loans/:id/replace-unpaid-repayments
app.put("/loans/:id/replace-unpaid-repayments", authRequired, async (req, res) => {
  const { id } = req.params;
  const { repayments: newReps } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid loan ID" });
  }

  if (!Array.isArray(newReps)) {
    return res.status(400).json({ error: "repayments must be an array" });
  }

  for (const r of newReps) {
    if (!r.date || r.amount == null) {
      return res.status(400).json({ error: "Each repayment must include date and amount" });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify loan exists
    const loan = await Loan.findById(id).session(session);
    if (!loan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Loan not found" });
    }

    // Delete unpaid repayments (status != '✅')
    await Repayment.deleteMany(
      { loanId: id, $or: [{ status: { $ne: "✅" } }, { status: null }] },
      { session }
    );

    // Insert new repayments
    const createdRepayments = [];
    for (const r of newReps) {
      const { date, amount, customerName, loanAmount, officer, branch, status } = r;
      const newRep = new Repayment({
        loanId: id,
        customerName: customerName || undefined,
        loanAmount: loanAmount || undefined,
        date,
        amount,
        officer: officer || undefined,
        branch: branch || undefined,
        status: status || undefined,
      });
      await newRep.save({ session });
      createdRepayments.push(newRep);
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch all repayments for this loan after transaction
    const updated = await Repayment.find({ loanId: id }).sort({ date: 1 });
    const repaymentWithStringIds = updated.map(rep => ({
      ...rep.toObject(),
      id: rep._id.toString(),
      _id: rep._id.toString(),
      loanId: rep.loanId.toString(),
    }));

    res.json(repaymentWithStringIds);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
});

