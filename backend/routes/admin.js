const express = require("express");
const User = require("../models/User");
const Opportunity = require("../models/Opportunity");
const Application = require("../models/Application");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/stats", authenticate, authorize("admin"), async (req, res) => {
  try {
    const [students, companies, opportunities, applications, selected] =
      await Promise.all([
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "company" }),
        Opportunity.countDocuments(),
        Application.countDocuments(),
        Application.countDocuments({ status: "Selected" })
      ]);

    res.json({ students, companies, opportunities, applications, selected });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin stats", error: error.message });
  }
});

module.exports = router;
