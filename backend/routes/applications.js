const express = require("express");
const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/:opportunityId", authenticate, authorize("student"), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.opportunityId);

    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    if (new Date(opportunity.deadline) < new Date()) {
      return res.status(400).json({ message: "This placement drive has closed." });
    }

    const already = await Application.findOne({
      student: req.user.id,
      opportunity: opportunity._id
    });

    if (already) {
      return res.status(409).json({ message: "You already applied to this drive." });
    }

    const application = await Application.create({
      student: req.user.id,
      opportunity: opportunity._id
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ message: "Application failed", error: error.message });
  }
});

router.get("/mine", authenticate, authorize("student"), async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate({
        path: "opportunity",
        populate: { path: "company", select: "name companyName" }
      })
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your applications", error: error.message });
  }
});

router.get("/company", authenticate, authorize("company"), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("student", "name email phone branch year cgpa backlogs")
      .populate({
        path: "opportunity",
        match: { company: req.user.id },
        select: "title location package deadline"
      })
      .sort({ createdAt: -1 });

    res.json(applications.filter(a => a.opportunity));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch company applications", error: error.message });
  }
});

router.patch("/:id/status", authenticate, authorize("company", "admin"), async (req, res) => {
  try {
    const allowed = ["Applied", "Shortlisted", "Selected", "Rejected"];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const application = await Application.findById(req.params.id)
      .populate("opportunity");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (
      req.user.role === "company" &&
      String(application.opportunity.company) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    application.status = req.body.status;
    await application.save();

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: "Failed to update application status", error: error.message });
  }
});

router.get("/all", authenticate, authorize("admin"), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("student", "name email branch year cgpa backlogs")
      .populate({
        path: "opportunity",
        populate: { path: "company", select: "name companyName" }
      })
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch applications", error: error.message });
  }
});

module.exports = router;
