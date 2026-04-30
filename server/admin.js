// admin.js (Express router for Super Admin user management)
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

function getUserModel() {
  return mongoose.models.User;
}

// Middleware to check Super Admin
function superAdminOnly(req, res, next) {
  if (req.userRole !== "Super Admin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }
  next();
}

// Get all users
router.get("/users", superAdminOnly, async (req, res) => {
  try {
    const User = getUserModel();
    const users = await User.find({}, "_id name email role createdAt").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role
router.put("/users/:id/role", superAdminOnly, async (req, res) => {
  try {
    const User = getUserModel();
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["Super Admin", "Credit Admin", "Relationship Manager", "Supervisor"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const user = await User.findByIdAndUpdate(id, { role }, { new: true, select: "_id name email role" });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
