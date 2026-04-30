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
    const users = await User.find({}, "_id name email role createdAt").sort({ createdAt: -1 });
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
      { new: true, select: "_id name email role createdAt" }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
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

/* ==================== Loans Routes (Protected) ==================== */

// GET /loans
app.get("/loans", authRequired, async (req, res) => {
  try {
    const loans = await Loan.find().sort({ createdAt: -1 });
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
    const { customerName, amount, interestRate, tenor, startDate, officer, branch } = req.body;
    if (!customerName || amount == null || interestRate == null || tenor == null || !startDate) {
      return res.status(400).json({ error: "Missing required loan fields" });
    }

    const loan = new Loan({
      customerName,
      amount,
      interestRate,
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
    const { customerName, amount, interestRate, tenor, startDate, officer, branch } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid loan ID" });
    }

    const loan = await Loan.findByIdAndUpdate(
      id,
      {
        customerName,
        amount,
        interestRate,
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
    const repayments = await Repayment.find().sort({ createdAt: -1 });
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

