const express = require("express");
const Setting = require("../models/Setting");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
router.use(protect);
// Only import, do NOT define inline

// GET sender email
router.get("/sender-email", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "senderEmail" });
    res.json({ senderEmail: setting ? setting.value : "" });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sender email" });
  }
});

// UPDATE sender email
router.put("/sender-email", async (req, res) => {
  try {
    const { senderEmail } = req.body;
    if (!senderEmail)
      return res.status(400).json({ message: "Email required" });

    const setting = await Setting.findOneAndUpdate(
      { key: "senderEmail" },
      { value: senderEmail },
      { upsert: true, new: true }
    );
    res.json({ senderEmail: setting.value });
  } catch (err) {
    res.status(500).json({ message: "Failed to update sender email" });
  }
});

// UPDATE sender email password
router.put("/sender-email-password", async (req, res) => {
  try {
    const { senderEmailPassword } = req.body;
    if (!senderEmailPassword)
      return res.status(400).json({ message: "Password required" });

    const setting = await Setting.findOneAndUpdate(
      { key: "senderEmailPassword" },
      { value: senderEmailPassword },
      { upsert: true, new: true }
    );
    res.json({ senderEmailPassword: setting.value });
  } catch (err) {
    res.status(500).json({ message: "Failed to update sender email password" });
  }
});

// GET all event types
router.get("/event-types", async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: "eventTypes" });
    let eventTypes = setting ? JSON.parse(setting.value) : ["hackathon"];
    res.json({ eventTypes });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch event types" });
  }
});

// POST add a new event type (admin only)
router.post("/event-types", async (req, res) => {
  // TODO: Replace with real admin check
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can add event types" });
  }
  const { eventType } = req.body;
  if (!eventType)
    return res.status(400).json({ message: "Event type required" });
  let setting = await Setting.findOne({ key: "eventTypes" });
  let eventTypes = setting ? JSON.parse(setting.value) : ["hackathon"];
  if (eventTypes.includes(eventType)) {
    return res.status(400).json({ message: "Event type already exists" });
  }
  eventTypes.push(eventType);
  await Setting.findOneAndUpdate(
    { key: "eventTypes" },
    { value: JSON.stringify(eventTypes) },
    { upsert: true, new: true }
  );
  res.json({ eventTypes });
});

// POST student requests a new event type
router.post("/event-type-requests", async (req, res) => {
  const { eventType } = req.body;
  if (!eventType)
    return res.status(400).json({ message: "Event type required" });
  let setting = await Setting.findOne({ key: "eventTypeRequests" });
  let requests = setting ? JSON.parse(setting.value) : [];
  requests.push({
    eventType,
    requestedBy: req.user?._id || null,
    date: new Date(),
  });
  await Setting.findOneAndUpdate(
    { key: "eventTypeRequests" },
    { value: JSON.stringify(requests) },
    { upsert: true, new: true }
  );
  res.json({ message: "Request submitted" });
});

// GET all event type requests (admin only)
router.get("/event-type-requests", async (req, res) => {
  // TODO: Replace with real admin check
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can view event type requests" });
  }
  let setting = await Setting.findOne({ key: "eventTypeRequests" });
  let requests = setting ? JSON.parse(setting.value) : [];
  res.json({ requests });
});

// DELETE an event type request (admin only)
router.delete("/event-type-requests", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can delete event type requests" });
  }
  const { eventType } = req.body;
  if (!eventType)
    return res.status(400).json({ message: "Event type required" });
  let setting = await Setting.findOne({ key: "eventTypeRequests" });
  let requests = setting ? JSON.parse(setting.value) : [];
  requests = requests.filter((req) => req.eventType !== eventType);
  await Setting.findOneAndUpdate(
    { key: "eventTypeRequests" },
    { value: JSON.stringify(requests) },
    { upsert: true, new: true }
  );
  res.json({ message: "Request deleted" });
});

// DELETE an event type (admin only)
router.delete("/event-types", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Only admin can delete event types" });
  }
  const { eventType } = req.body;
  if (!eventType)
    return res.status(400).json({ message: "Event type required" });
  let setting = await Setting.findOne({ key: "eventTypes" });
  let eventTypes = setting ? JSON.parse(setting.value) : [];
  eventTypes = eventTypes.filter((et) => et !== eventType);
  await Setting.findOneAndUpdate(
    { key: "eventTypes" },
    { value: JSON.stringify(eventTypes) },
    { upsert: true, new: true }
  );
  res.json({ eventTypes });
});

// GET auto-forward faculty timeout
router.get("/auto-forward-faculty-timeout", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "autoForwardFacultyTimeout" });
    res.json({ timeout: setting ? Number(setting.value) : 60 }); // default 60 minutes
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch timeout" });
  }
});

// PUT auto-forward faculty timeout (admin only)
router.put("/auto-forward-faculty-timeout", async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can update timeout" });
  }
  const { timeout } = req.body;
  if (typeof timeout !== "number" || timeout < 1) {
    return res
      .status(400)
      .json({ message: "Timeout must be a positive number (minutes)" });
  }
  const setting = await Setting.findOneAndUpdate(
    { key: "autoForwardFacultyTimeout" },
    { value: String(timeout) },
    { upsert: true, new: true }
  );
  res.json({ timeout: Number(setting.value) });
});

module.exports = router;
