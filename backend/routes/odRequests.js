const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const {
  protect,
  faculty,
  student,
  hod,
} = require("../middleware/authMiddleware");
const ODRequest = require("../models/ODRequest");
const User = require("../models/User");

// @desc    Create new OD request
// @route   POST /api/od-requests
// @access  Private/Student
router.post(
  "/",
  protect,
  student,
  asyncHandler(async (req, res) => {
    console.log("req.user in OD request creation:", req.user);

    const { eventName, eventDate, startDate, endDate, reason } = req.body;

    // Get student details from auth token
    const studentUser = await User.findById(req.user.id).populate(
      "facultyAdvisor"
    );
    if (!studentUser) {
      res.status(404);
      throw new Error("Student user not found");
    }

    // Get HOD for the department
    const hod = await User.findOne({
      role: "hod",
      department: studentUser.department,
    });

    if (!hod) {
      res.status(404);
      throw new Error("HOD not found for the department");
    }

    const odRequest = await ODRequest.create({
      student: req.user.id,
      classAdvisor: studentUser.facultyAdvisor._id,
      hod: hod._id,
      department: studentUser.department,
      year: studentUser.year,
      eventName,
      eventDate,
      startDate,
      endDate,
      reason,
    });

    res.status(201).json(odRequest);
  })
);

// @desc    Get student's OD requests
// @route   GET /api/od-requests/my-requests
// @access  Private/Student
router.get(
  "/my-requests",
  protect,
  student,
  asyncHandler(async (req, res) => {
    const odRequests = await ODRequest.find({ student: req.user.id })
      .populate("classAdvisor", "name email")
      .sort({ createdAt: -1 });
    res.json(odRequests);
  })
);

// @desc    Get all OD requests for faculty
// @route   GET /api/od-requests/faculty
// @access  Private/Faculty
router.get(
  "/faculty",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    console.log("Faculty Request - User:", req.user);

    try {
      const odRequests = await ODRequest.find({ classAdvisor: req.user._id })
        .populate("student", "name email department year")
        .sort({ createdAt: -1 });

      console.log("Found requests for faculty:", odRequests.length);
      res.json(odRequests);
    } catch (error) {
      console.error("Error fetching faculty requests:", error);
      res.status(500).json({
        message: "Error fetching requests",
        error: error.message,
      });
    }
  })
);

// @desc    Get all OD requests for a class advisor
// @route   GET /api/od-requests/advisor-requests
// @access  Private/ClassAdvisor
router.get(
  "/advisor-requests",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    const odRequests = await ODRequest.find({ classAdvisor: req.user.id })
      .populate("student", "name email department year")
      .sort({ createdAt: -1 });
    res.json(odRequests);
  })
);

// @desc    Update OD request status
// @route   PUT /api/od-requests/:id/status
// @access  Private/Faculty
router.put(
  "/:id/status",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    const { status, remarks } = req.body;
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the user is the class advisor
    if (odRequest.classAdvisor.toString() !== req.user.id.toString()) {
      res.status(401);
      throw new Error("Not authorized");
    }

    odRequest.status = status;
    odRequest.remarks = remarks;
    odRequest.updatedAt = Date.now();

    const updatedRequest = await odRequest.save();
    res.json(updatedRequest);
  })
);

// @desc    Submit proof for OD request
// @route   PUT /api/od-requests/:id/proof
// @access  Private/Student
router.put(
  "/:id/proof",
  protect,
  student,
  asyncHandler(async (req, res) => {
    const { proofDocument } = req.body;
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the user is the student who created the request
    if (odRequest.student.toString() !== req.user.id.toString()) {
      res.status(401);
      throw new Error("Not authorized");
    }

    // Check if the request is approved
    if (odRequest.status !== "approved") {
      res.status(400);
      throw new Error("Request must be approved before submitting proof");
    }

    odRequest.proofDocument = proofDocument;
    odRequest.proofSubmitted = true;
    odRequest.updatedAt = Date.now();

    const updatedRequest = await odRequest.save();
    res.json(updatedRequest);
  })
);

// @desc    Verify proof document
// @route   PUT /api/od-requests/:id/verify-proof
// @access  Private/ClassAdvisor
router.put(
  "/:id/verify-proof",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the user is the class advisor
    if (odRequest.classAdvisor.toString() !== req.user.id.toString()) {
      res.status(401);
      throw new Error("Not authorized");
    }

    // Check if proof has been submitted
    if (!odRequest.proofSubmitted) {
      res.status(400);
      throw new Error("No proof document submitted yet");
    }

    odRequest.proofVerified = true;
    odRequest.updatedAt = Date.now();

    const updatedRequest = await odRequest.save();
    res.json(updatedRequest);
  })
);

// @route   GET api/od-requests/student
// @desc    Get all OD requests for logged in student
// @access  Private
router.get("/student", protect, student, async (req, res) => {
  try {
    const requests = await ODRequest.find({ student: req.user.id })
      .populate("classAdvisor", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/od-requests/advisor
// @desc    Get all OD requests for logged in faculty (class advisor)
// @access  Private
router.get("/advisor", protect, faculty, async (req, res) => {
  try {
    const requests = await ODRequest.find({ classAdvisor: req.user.id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @desc    Get all OD requests for HOD
// @route   GET /api/od-requests/hod
// @access  Private/HOD
router.get(
  "/hod",
  protect,
  hod,
  asyncHandler(async (req, res) => {
    console.log("HOD Request - User:", req.user);

    try {
      console.log("Fetching requests for department:", req.user.department);
      const odRequests = await ODRequest.find({
        department: req.user.department,
      })
        .populate("student", "name email")
        .populate("classAdvisor", "name email")
        .sort({ createdAt: -1 });

      console.log("Found requests:", odRequests.length);
      res.json(odRequests);
    } catch (error) {
      console.error("Error fetching HOD requests:", error);
      res.status(500).json({
        message: "Error fetching requests",
        error: error.message,
      });
    }
  })
);

// @desc    HOD approve OD request
// @route   PUT /api/od-requests/:id/hod-approve
// @access  Private/HOD
router.put(
  "/:id/hod-approve",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "hod") {
      res.status(403);
      throw new Error("Not authorized as HOD");
    }

    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (odRequest.department !== req.user.department) {
      res.status(403);
      throw new Error(
        "Not authorized to approve requests from other departments"
      );
    }

    if (odRequest.status !== "approved_by_advisor") {
      res.status(400);
      throw new Error("Request must be approved by advisor first");
    }

    odRequest.status = "approved_by_hod";
    odRequest.hodComment = req.body.comment || "";
    await odRequest.save();

    res.json(odRequest);
  })
);

// @desc    HOD reject OD request
// @route   PUT /api/od-requests/:id/hod-reject
// @access  Private/HOD
router.put(
  "/:id/hod-reject",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "hod") {
      res.status(403);
      throw new Error("Not authorized as HOD");
    }

    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (odRequest.department !== req.user.department) {
      res.status(403);
      throw new Error(
        "Not authorized to reject requests from other departments"
      );
    }

    odRequest.status = "rejected";
    odRequest.hodComment = req.body.comment || "";
    await odRequest.save();

    res.json(odRequest);
  })
);

// @desc    Faculty approve OD request
// @route   PUT /api/od-requests/:id/advisor-approve
// @access  Private/Faculty
router.put(
  "/:id/advisor-approve",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    console.log("Faculty approve request - User:", req.user);

    try {
      const odRequest = await ODRequest.findById(req.params.id);

      if (!odRequest) {
        res.status(404);
        throw new Error("OD request not found");
      }

      if (odRequest.classAdvisor.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to approve this request");
      }

      if (odRequest.status !== "pending") {
        res.status(400);
        throw new Error("Request is not in pending status");
      }

      odRequest.status = "approved_by_advisor";
      odRequest.advisorComment = req.body.comment || "";
      await odRequest.save();

      console.log("Request approved by advisor:", odRequest._id);
      res.json(odRequest);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({
        message: "Error approving request",
        error: error.message,
      });
    }
  })
);

// @desc    Faculty reject OD request
// @route   PUT /api/od-requests/:id/advisor-reject
// @access  Private/Faculty
router.put(
  "/:id/advisor-reject",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    console.log("Faculty reject request - User:", req.user);

    try {
      const odRequest = await ODRequest.findById(req.params.id);

      if (!odRequest) {
        res.status(404);
        throw new Error("OD request not found");
      }

      if (odRequest.classAdvisor.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to reject this request");
      }

      if (odRequest.status !== "pending") {
        res.status(400);
        throw new Error("Request is not in pending status");
      }

      odRequest.status = "rejected";
      odRequest.advisorComment = req.body.comment || "";
      await odRequest.save();

      console.log("Request rejected by advisor:", odRequest._id);
      res.json(odRequest);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({
        message: "Error rejecting request",
        error: error.message,
      });
    }
  })
);

module.exports = router;
