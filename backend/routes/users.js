const express = require("express");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
});

router.put("/me", authenticate, async (req, res) => {
  try {
    const allowed = [
      "name",
      "phone",
      "branch",
      "year",
      "cgpa",
      "backlogs",
      "companyName",
      "website",
      "description"
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true
    }).select("-password");

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: "Profile update failed", error: error.message });
  }
});

router.get("/students", authenticate, authorize("admin"), async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
});

router.get("/companies", authenticate, authorize("admin"), async (req, res) => {
  try {
    const companies = await User.find({ role: "company" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch companies", error: error.message });
  }
});

module.exports = router;
