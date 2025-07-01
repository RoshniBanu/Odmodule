const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const {
  protect,
  faculty,
  student,
  hod,
} = require("../middleware/authMiddleware");
const ODRequest = require("../models/ODRequest");
const User = require("../models/User");
const multer = require("multer");
const {
  sendODRequestNotification,
  sendProofVerificationNotification,
} = require("../utils/emailService");
const Setting = require("../models/Setting");

// Helper function to draw a table row with cell content (no borders drawn by this function)
function drawTableRowContent(
  doc,
  data,
  cellWidths,
  startX,
  currentY,
  rowHeight,
  isHeader = false
) {
  doc.y = currentY; // Set the starting Y for this row
  let x_cursor = startX;

  // Set font for text
  doc.font(isHeader ? "Helvetica-Bold" : "Helvetica");

  for (let i = 0; i < data.length; i++) {
    const text_content = data[i];
    const cell_width = cellWidths[i];

    // Calculate text position to center vertically and add padding
    const text_x = x_cursor + 5;
    const text_y = currentY + (rowHeight - doc.currentLineHeight()) / 2;
    doc.text(text_content, text_x, text_y, {
      width: cell_width - 10,
      align: "left",
      valign: "middle",
      lineGap: 0, // Ensure no extra line spacing
    });

    x_cursor += cell_width;
  }
  return currentY; // Return original Y as this function doesn't manage row height advancement
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/proofs";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Only PDF, JPEG, JPG & PNG files are allowed!");
    }
  },
});

// Configure multer for file upload
const brochureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/brochures";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const brochureUpload = multer({
  storage: brochureStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: Only PDF, JPEG, JPG & PNG files are allowed!");
    }
  },
});

// @desc    Create new OD request
// @route   POST /api/od-requests
// @access  Private/Student
router.post(
  "/",
  protect,
  student,
  brochureUpload.single("brochure"),
  asyncHandler(async (req, res) => {
    console.log("REQ.BODY:", req.body); // <-- Add this line
    try {
      const {
        eventName,
        eventType,
        eventDate,
        startDate,
        endDate,
        timeType,
        startTime,
        endTime,
        reason,
        notifyFaculty,
      } = req.body;

      // Get the student's details
      const student = await User.findById(req.user._id);
      if (!student || !student.facultyAdvisor) {
        return res
          .status(400)
          .json({ message: "Student must have a faculty advisor assigned" });
      }

      // Get HOD details
      const hod = await User.findOne({
        role: "hod",
        department: student.department,
      });
      if (!hod) {
        return res
          .status(400)
          .json({ message: "HOD not found for the department" });
      }

      const odRequest = new ODRequest({
        student: req.user._id,
        eventName,
        eventType: eventType ? String(eventType) : undefined,
        eventDate,
        startDate,
        endDate,
        timeType,
        startTime: timeType === "particularHours" ? startTime : undefined,
        endTime: timeType === "particularHours" ? endTime : undefined,
        reason,
        facultyAdvisor: student.facultyAdvisor,
        classAdvisor: student.facultyAdvisor, // Using faculty advisor as class advisor
        hod: hod._id,
        department: student.department,
        year: student.year,
        notifyFaculty: notifyFaculty || [],
        brochure: req.file ? req.file.path : null,
      });

      console.log("eventType before save:", eventType);
      await odRequest.save();
      console.log("odRequest object:", odRequest);

      // Get faculty advisor details
      const facultyAdvisor = await User.findById(student.facultyAdvisor);

      // Send email notification to faculty advisor
      await sendODRequestNotification(
        facultyAdvisor.email,
        {
          name: req.user.name,
          registerNo: req.user.registerNo,
          department: req.user.department,
          year: req.user.year,
        },
        {
          eventName,
          eventType,
          eventDate,
          startDate,
          endDate,
          timeType,
          startTime,
          endTime,
          reason,
        }
      );

      res.status(201).json(odRequest);
    } catch (error) {
      console.error("Error creating OD request:", error);
      res
        .status(500)
        .json({ message: "Error creating OD request", error: error.message });
    }
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
      .populate("notifyFaculty", "name email")
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
        .populate("notifyFaculty", "name email")
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
// @desc    Verify proof document
// @route   PUT /api/od-requests/:id/verify-proof
// @access  Private/ClassAdvisor
router.put(
  "/:id/verify-proof",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    console.log(`Attempting to verify proof for request ID: ${req.params.id}`);
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name email registerNo department year")
      .populate("facultyAdvisor", "name email");

    if (!odRequest) {
      console.log(`OD Request with ID ${req.params.id} not found.`);
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

    // Check if approved PDF already exists, if not generate it
    let approvedPDFPath = updatedRequest.approvedPDFPath;
    const expectedApprovedPath = path.resolve(
      "uploads/od_letters",
      `approved_${updatedRequest._id}.pdf`
    );

    // Check if the stored path exists, or if the expected file exists on disk
    if (!approvedPDFPath || !fs.existsSync(approvedPDFPath)) {
      if (fs.existsSync(expectedApprovedPath)) {
        // File exists on disk but not in database, use it and update database
        approvedPDFPath = expectedApprovedPath;
        updatedRequest.approvedPDFPath = approvedPDFPath;
        await updatedRequest.save();
      } else {
        // File doesn't exist, generate new one
        approvedPDFPath = expectedApprovedPath;
        await generateApprovedPDF(updatedRequest, approvedPDFPath);

        // Save the path to the database
        updatedRequest.approvedPDFPath = approvedPDFPath;
        await updatedRequest.save();
      }
    }

    // Send email notification to faculty (class advisor and optionally notifyFaculty)
    const facultyEmails = [odRequest.facultyAdvisor.email];
    if (odRequest.notifyFaculty && odRequest.notifyFaculty.length > 0) {
      const notifiedFacultyEmails = await User.find({
        _id: { $in: odRequest.notifyFaculty },
      }).select("email");
      facultyEmails.push(...notifiedFacultyEmails.map((f) => f.email));
    }

    // Fallback for eventType if missing
    const eventTypeToSend = odRequest.eventType || "Unknown";

    await sendProofVerificationNotification(
      facultyEmails,
      {
        name: odRequest.student.name,
        registerNo: odRequest.student.registerNo,
        department: odRequest.student.department,
        year: odRequest.student.year,
      },
      {
        eventName: odRequest.eventName,
        eventType: eventTypeToSend,
        eventDate: odRequest.eventDate,
        startDate: odRequest.startDate,
        endDate: odRequest.endDate,
        timeType: odRequest.timeType,
        startTime: odRequest.startTime,
        endTime: odRequest.endTime,
        reason: odRequest.reason,
      },
      odRequest.proofDocument,
      approvedPDFPath
    );

    res.json(updatedRequest);
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
      .populate("notifyFaculty", "name email")
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
    console.log("OD Request status updated by faculty:", updatedRequest);
    res.json(updatedRequest);
  })
);

// @desc    Submit proof for OD request
// @route   POST /api/od-requests/:id/submit-proof
// @access  Private/Student
router.post(
  "/:id/submit-proof",
  protect,
  student,
  upload.single("proofDocument"),
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (odRequest.student.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to submit proof for this request");
    }

    if (!req.file) {
      res.status(400);
      throw new Error("No proof document uploaded");
    }

    odRequest.proofDocument = req.file.path;
    odRequest.proofSubmitted = true;
    if (req.body.notifyFaculty) {
      odRequest.notifyFaculty = JSON.parse(req.body.notifyFaculty);
    }
    await odRequest.save();

    res.json({ message: "Proof document submitted successfully" });
  })
);

// @route   GET api/od-requests/student
// @desc    Get all OD requests for logged in student
// @access  Private
router.get("/student", protect, student, async (req, res) => {
  try {
    const odRequests = await ODRequest.find({ student: req.user.id })
      .populate("classAdvisor", "name email")
      .populate("notifyFaculty", "name email")
      .sort({ createdAt: -1 });
    res.json(odRequests);
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
    try {
      // Fetch all OD requests for the HOD's department
      const odRequests = await ODRequest.find({
        department: req.user.department,
      })
        .populate("student", "name email registerNo")
        .populate("classAdvisor", "name email")
        .populate("notifyFaculty", "name email")
        .sort({ createdAt: -1 });
      res.json(odRequests);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching requests",
        error: error.message,
      });
    }
  })
);

// @desc    Faculty approve OD request (with PDF generation)
// @route   PUT /api/od-requests/:id/hod-approve
// @access  Private/HOD
router.put(
  "/:id/hod-approve",
  protect,
  hod,
  asyncHandler(async (req, res) => {
    const { status, remarks } = req.body;
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name registerNo department year")
      .populate("classAdvisor", "name")
      .populate("hod", "name")
      .populate("notifyFaculty", "name email");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the user is an HOD in the student's department
    if (req.user.department !== odRequest.student.department.toString()) {
      res.status(401);
      throw new Error("Not authorized to approve requests for this department");
    }

    // Preserve the existing facultyAdvisor
    const facultyAdvisor = odRequest.facultyAdvisor;

    odRequest.hodStatus = status;
    odRequest.remarks = remarks;
    odRequest.updatedAt = Date.now();
    odRequest.facultyAdvisor = facultyAdvisor; // Ensure facultyAdvisor is preserved
    odRequest.status = "approved_by_hod";
    odRequest.hodApprovedAt = new Date();

    const updatedRequest = await odRequest.save();

    // Generate approved PDF when HOD approves the request
    const approvedPDFPath = path.resolve(
      "uploads/od_letters",
      `approved_${updatedRequest._id}.pdf`
    );
    await generateApprovedPDF(updatedRequest, approvedPDFPath);

    // Save the path to the database
    updatedRequest.approvedPDFPath = approvedPDFPath;
    await updatedRequest.save();

    console.log("OD Request status updated by HOD:", updatedRequest);
    res.json(updatedRequest);
  })
);

// @desc    HOD reject OD request
// @route   PUT /api/od-requests/:id/hod-reject
// @access  Private/HOD
router.put(
  "/:id/hod-reject",
  protect,
  hod,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name registerNo department year")
      .populate("classAdvisor", "name")
      .populate("hod", "name")
      .populate("notifyFaculty", "name email");

    console.log("HOD rejecting request with ID:", req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (
      req.user.role !== "hod" ||
      req.user.department !== odRequest.department
    ) {
      console.error(
        "HOD authorization failed. User Role:",
        req.user.role,
        "User Department:",
        req.user.department,
        "Request Department:",
        odRequest.department
      );
      res.status(403);
      throw new Error("Not authorized as HOD for this department");
    }

    // Preserve the existing facultyAdvisor
    const facultyAdvisor = odRequest.facultyAdvisor;

    odRequest.status = "rejected";
    odRequest.hodComment = req.body.comment || "";
    odRequest.updatedAt = Date.now();
    odRequest.facultyAdvisor = facultyAdvisor; // Ensure facultyAdvisor is preserved

    const updatedRequest = await odRequest.save();
    console.log("OD Request rejected by HOD:", updatedRequest);
    res.json(updatedRequest);
  })
);

// @desc    Generate OD request PDF
// @route   GET /api/od-requests/:id/download-pdf
// @access  Private/Student
router.get(
  "/:id/download-pdf",
  protect,
  student,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name registerNo department year")
      .populate("classAdvisor", "name")
      .populate("hod", "name");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=od_request_${odRequest._id}.pdf`
    );

    doc.pipe(res);

    // doc.lineWidth(0.5); // Set global line thickness for all borders

    // Draw page border
    doc
      .rect(
        doc.page.margins.left - 5,
        doc.page.margins.top - 5,
        doc.page.width - doc.page.margins.left - doc.page.margins.right + 10,
        doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10
      )
      .stroke();

    // Set initial font and size for general text
    doc.font("Helvetica").fontSize(9);
    const logoPath = path.join(__dirname, "../assets/anna_univ_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoWidth = 60;
      const logoHeight = 60;
      const leftX = doc.page.margins.left;
      doc.image(logoPath, leftX, doc.page.margins.top + 10, {
        width: logoWidth,
        height: logoHeight,
      });
      doc.moveDown(2.5); // Add space after logo
    }

    // University Header
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("COLLEGE OF ENGINEERING GUINDY", { align: "center" });
    doc.text("Chennai-600025", { align: "center" });
    doc.moveDown(0.7); // Adjusted for slightly more space

    // ON DUTY title
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ON DUTY APPROVAL FORM", { align: "center" });
    doc.moveDown(1.2); // More space after title

    // STUDENT DETAILS Section as a Table
    // doc.fontSize(10).font('Helvetica-Bold').text('STUDENT DETAILS',{ align: 'center' }); // Removed: Merging with Purpose
    // doc.moveDown(0.5); // Removed: Merging with Purpose

    const studentDetailsStartX = doc.page.margins.left;
    const studentDetailsTotalWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const studentDetailsLabelWidth = studentDetailsTotalWidth * 0.3; // 30% for label
    const studentDetailsValueWidth = studentDetailsTotalWidth * 0.7; // 70% for value
    const studentDetailsCellWidths = [
      studentDetailsLabelWidth,
      studentDetailsValueWidth,
    ];
    let studentDetailsCurrentY = doc.y; // Start from here after title spacing
    const studentDetailsRowHeight = 20;
    let itemCounter = 1; // Renamed to a more general counter

    // Header row for Student Details (optional, can be removed if not desired in combined section)
    // drawTableRowContent(doc, ['Field', 'Value'], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight, true); // Removed: Merging with Purpose
    // studentDetailsCurrentY += studentDetailsRowHeight;

    // Data rows for Student Details
    drawTableRowContent(
      doc,
      [`${itemCounter++}. Name:`, odRequest.student.name],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    drawTableRowContent(
      doc,
      [
        `${itemCounter++}. Register Number:`,
        odRequest.student.registerNo || "N/A",
      ],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    drawTableRowContent(
      doc,
      [`${itemCounter++}. Department:`, odRequest.student.department],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    drawTableRowContent(
      doc,
      [`${itemCounter++}. Year:`, odRequest.student.year],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    drawTableRowContent(
      doc,
      [`${itemCounter++}. Event Name:`, odRequest.eventName],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    drawTableRowContent(
      doc,
      [`${itemCounter++}. Event Type:`, odRequest.eventType],
      studentDetailsCellWidths,
      studentDetailsStartX,
      studentDetailsCurrentY,
      studentDetailsRowHeight
    );
    studentDetailsCurrentY += studentDetailsRowHeight;

    // doc.moveDown(1); // Removed: continuous flow

    // PURPOSE Section (now combined with Student Details)
    // doc.fontSize(10).font('Helvetica-Bold').text('PURPOSE'); // Removed this heading
    // doc.moveDown(0.5); // Removed this

    const purposeStartX = doc.page.margins.left; // Still use to define start of its own section
    const purposeTotalWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const purposeLabelWidth = purposeTotalWidth * 0.35; // 35% for label
    const purposeValueWidth = purposeTotalWidth * 0.65; // 65% for value
    const purposeCellWidths = [purposeLabelWidth, purposeValueWidth];
    let purposeCurrentY = studentDetailsCurrentY; // Continue from where student details left off
    const purposeRowHeight = 20;

    // No header row for Purpose section since it's continuous
    // drawTableRowContent(doc, ['Field', 'Value'], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight, true); // Removed this
    // purposeCurrentY += purposeRowHeight;

    // Data rows for Purpose
    drawTableRowContent(
      doc,
      [`${itemCounter++}. Reason:`, odRequest.reason],
      purposeCellWidths,
      purposeStartX,
      purposeCurrentY,
      purposeRowHeight
    ); // Re-added this field in correct order
    purposeCurrentY += purposeRowHeight;

    const daysRequired =
      Math.ceil(
        (new Date(odRequest.endDate) - new Date(odRequest.startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    drawTableRowContent(
      doc,
      [
        `${itemCounter++}. No. of OD Days required:`,
        `${daysRequired} day(s) from ${new Date(
          odRequest.startDate
        ).toLocaleDateString()} to ${new Date(
          odRequest.endDate
        ).toLocaleDateString()}`,
      ],
      purposeCellWidths,
      purposeStartX,
      purposeCurrentY,
      purposeRowHeight
    );
    purposeCurrentY += purposeRowHeight;

    drawTableRowContent(
      doc,
      [
        `${itemCounter++}. Authority Sanctioning the OD:`,
        `${odRequest.classAdvisor.name} (Class Advisor) and ${odRequest.hod.name} (HOD)`,
      ],
      purposeCellWidths,
      purposeStartX,
      purposeCurrentY,
      purposeRowHeight
    );
    purposeCurrentY += purposeRowHeight;

    drawTableRowContent(
      doc,
      [`${itemCounter++}. Date of Sanction:`, new Date().toLocaleDateString()],
      purposeCellWidths,
      purposeStartX,
      purposeCurrentY,
      purposeRowHeight
    );
    purposeCurrentY += purposeRowHeight;

    // Add time information based on timeType
    if (odRequest.timeType === "particularHours") {
      const startTimeStr = odRequest.startTime
        ? new Date(odRequest.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      const endTimeStr = odRequest.endTime
        ? new Date(odRequest.endTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      drawTableRowContent(
        doc,
        [
          `${itemCounter++}. No. of OD Full days/Half Days Availed:`,
          `Particular Hours (${startTimeStr} to ${endTimeStr})`,
        ],
        purposeCellWidths,
        purposeStartX,
        purposeCurrentY,
        purposeRowHeight
      );
    } else {
      drawTableRowContent(
        doc,
        [
          `${itemCounter++}. No. of OD Full days/Half Days Availed:`,
          "Full Day",
        ],
        purposeCellWidths,
        purposeStartX,
        purposeCurrentY,
        purposeRowHeight
      );
    }
    purposeCurrentY += purposeRowHeight + 20;
    doc.y = purposeCurrentY;

    doc.moveDown(2); // More space before signatures

    // Signature Section (no visible table borders)
    const sigX = purposeStartX;
    const sigWidth = purposeTotalWidth;
    const colWidth = sigWidth / 4; // 4 columns: Student, Class Advisor, HOD, Dean
    let sigY = purposeCurrentY;
    const sigRowHeight = 20;
    let sigItemCounter = itemCounter;

    // Header row for signatures
    drawTableRowContent(
      doc,
      ["STUDENT", "CLASS ADVISOR", "HOD", "DEAN"],
      [colWidth, colWidth, colWidth, colWidth],
      sigX,
      sigY,
      sigRowHeight,
      true
    );
    sigY += sigRowHeight;

    // Data rows for signatures
    const sigDataY = sigY;
    const textOptions = { width: colWidth, align: "left" };

    // Student
    doc.x = sigX;
    doc.y = sigDataY;
    doc.font("Helvetica").text(`Name: ${odRequest.student.name}`, textOptions);
    const studentSigEndY = doc.y;

    // Class Advisor
    doc.x = sigX + colWidth;
    doc.y = sigDataY;
    doc
      .font("Helvetica")
      .text(`Name: ${odRequest.classAdvisor.name}`, textOptions);
    doc.moveDown(0.5);
    doc.text(
      `Date: ${
        odRequest.advisorApprovedAt
          ? new Date(odRequest.advisorApprovedAt).toLocaleDateString()
          : "-"
      }`,
      textOptions
    );
    doc.font("Helvetica-Bold").text("DIGITALLY SIGNED", textOptions);
    const classAdvisorSigEndY = doc.y;

    // HOD
    doc.x = sigX + colWidth * 2;
    doc.y = sigDataY;
    doc.font("Helvetica").text(`Name: ${odRequest.hod.name}`, textOptions);
    doc.moveDown(0.5);
    doc.text(
      `Date: ${
        odRequest.hodApprovedAt
          ? new Date(odRequest.hodApprovedAt).toLocaleDateString()
          : "-"
      }`,
      textOptions
    );
    doc.font("Helvetica-Bold").text("DIGITALLY SIGNED", textOptions);
    const hodSigEndY = doc.y;

    // Dean (no name, no signature text)
    doc.x = sigX + colWidth * 3;
    doc.y = sigDataY;
    doc.text("", textOptions);
    const deanSigEndY = doc.y;

    // No borders for signature section
    // ... existing code ...

    doc.end();

    // Ensure the response is finalized only after the PDF stream ends
    doc.on("end", () => {
      res.end();
    });
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
      odRequest.advisorApprovedAt = new Date();
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

// Add new route for downloading PDF of approved requests
// @desc    Download PDF for approved OD request
// @route   GET /api/od-requests/:id/download-approved-pdf
// @access  Private/Student
router.get(
  "/:id/download-approved-pdf",
  protect,
  student,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name registerNo department year")
      .populate("classAdvisor", "name")
      .populate("hod", "name");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the request is approved
    if (odRequest.status !== "approved_by_hod") {
      res.status(400);
      throw new Error("Only approved requests can be downloaded");
    }

    // Check if the user is the student who created the request
    if (odRequest.student._id.toString() !== req.user.id.toString()) {
      res.status(401);
      throw new Error("Not authorized to download this request");
    }

    // Check if approved PDF already exists, if not generate it
    let approvedPDFPath = odRequest.approvedPDFPath;
    if (!approvedPDFPath || !fs.existsSync(approvedPDFPath)) {
      approvedPDFPath = path.resolve(
        "uploads/od_letters",
        `approved_${odRequest._id}.pdf`
      );
      await generateApprovedPDF(odRequest, approvedPDFPath);

      // Save the path to the database
      odRequest.approvedPDFPath = approvedPDFPath;
      await odRequest.save();
    }

    // Send the existing PDF file
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=od_request_${odRequest._id}.pdf`
    );

    const fileStream = fs.createReadStream(approvedPDFPath);
    fileStream.pipe(res);
  })
);

// @desc    Get all OD requests for admin
// @route   GET /api/od-requests/admin
// @access  Private/Admin
router.get(
  "/admin",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(401);
      throw new Error("Not authorized as admin");
    }

    // Find requests that are either forwarded to admin or pending for more than 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000);

    // First, update any pending requests that are older than 30 seconds
    await ODRequest.updateMany(
      {
        status: "pending",
        lastStatusChangeAt: { $lt: thirtySecondsAgo },
      },
      {
        $set: {
          status: "forwarded_to_admin",
          forwardedToAdminAt: Date.now(),
          lastStatusChangeAt: Date.now(),
        },
      }
    );

    // Build the query
    let query = {
      $or: [
        { status: "forwarded_to_admin" },
        {
          status: "pending",
          lastStatusChangeAt: { $lt: thirtySecondsAgo },
        },
      ],
    };

    // If roll number is provided in query params, add it to the query
    if (req.query.rollNumber) {
      // First find the student with the given roll number
      const student = await User.findOne({
        registerNo: req.query.rollNumber,
        role: "student",
      });

      if (student) {
        query.student = student._id;
      } else {
        // If no student found with the roll number, return empty array
        return res.json([]);
      }
    }

    // Then fetch all relevant requests
    const odRequests = await ODRequest.find(query)
      .populate("student", "name email department year registerNo")
      .populate("classAdvisor", "name email")
      .populate("hod", "name email")
      .sort({ lastStatusChangeAt: -1 });

    res.json(odRequests);
  })
);

// @desc    Forward OD request to HOD
// @route   PUT /api/od-requests/:id/forward-to-hod
// @access  Private/Admin
router.put(
  "/:id/forward-to-hod",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(401);
      throw new Error("Not authorized as admin");
    }

    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (odRequest.status !== "forwarded_to_admin") {
      res.status(400);
      throw new Error("Request is not in forwarded_to_admin status");
    }

    odRequest.status = "forwarded_to_hod";
    odRequest.forwardedToHodAt = Date.now();
    odRequest.lastStatusChangeAt = Date.now();

    const updatedRequest = await odRequest.save();
    res.json(updatedRequest);
  })
);

let autoForwardTimeoutMinutes = 60;
let autoForwardInterval = null;

const loadAutoForwardTimeout = async () => {
  const setting = await Setting.findOne({ key: "autoForwardFacultyTimeout" });
  autoForwardTimeoutMinutes = setting ? Number(setting.value) : 60;
};

const checkUnrespondedRequests = async () => {
  const threshold = new Date(
    Date.now() - autoForwardTimeoutMinutes * 60 * 1000
  );
  const unrespondedRequests = await ODRequest.find({
    status: "pending",
    lastStatusChangeAt: { $lt: threshold },
  });
  for (const request of unrespondedRequests) {
    request.status = "forwarded_to_admin";
    request.forwardedToAdminAt = Date.now();
    request.lastStatusChangeAt = Date.now();
    await request.save();
  }
};

const startAutoForwardInterval = async () => {
  await loadAutoForwardTimeout();
  if (autoForwardInterval) clearInterval(autoForwardInterval);
  autoForwardInterval = setInterval(checkUnrespondedRequests, 60 * 1000); // check every minute
};

startAutoForwardInterval();

// @desc    Get student statistics for admin
// @route   GET /api/od-requests/admin/student-stats
// @access  Private/Admin
router.get(
  "/admin/student-stats",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(401);
      throw new Error("Not authorized as admin");
    }

    const stats = await User.aggregate([
      { $match: { role: "student" } },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $project: { year: "$_id", count: 1, _id: 0 } },
      { $sort: { year: 1 } },
    ]);

    res.json(stats);
  })
);

// @desc    Generate PDF for OD request
// @route   GET /api/od-requests/:id/generate-pdf
// @access  Private/Faculty
router.get(
  "/:id/generate-pdf",
  protect,
  faculty,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name registerNo department year")
      .populate("classAdvisor", "name")
      .populate("hod", "name");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (!odRequest.proofVerified) {
      res.status(400);
      throw new Error("Proof must be verified before generating PDF");
    }

    // Create a new PDF document
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=od-request-${odRequest._id}.pdf`
    );

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text("On Duty Request Certificate", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Student Name: ${odRequest.student.name}`);
    doc.text(`Register Number: ${odRequest.student.registerNo}`);
    doc.text(`Department: ${odRequest.student.department}`);
    doc.text(`Year: ${odRequest.student.year}`);
    doc.moveDown();
    doc.text(`Event Name: ${odRequest.eventName}`);
    doc.text(
      `Event Date: ${new Date(odRequest.eventDate).toLocaleDateString()}`
    );
    doc.text(
      `Start Date: ${new Date(odRequest.startDate).toLocaleDateString()}`
    );
    doc.text(`End Date: ${new Date(odRequest.endDate).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Reason: ${odRequest.reason}`);
    doc.moveDown();
    doc.text(`Class Advisor: ${odRequest.classAdvisor.name}`);
    doc.text(`HOD: ${odRequest.hod.name}`);
    doc.moveDown();
    doc.text(`Status: ${odRequest.status.replace(/_/g, " ").toUpperCase()}`);
    doc.text(`Proof Verified: ${odRequest.proofVerified ? "Yes" : "No"}`);
    doc.moveDown();
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`);

    // Finalize the PDF
    doc.end();
  })
);

// Helper function to generate OD request letter PDF
const generateODLetterPDF = async (odRequest, outputPath) => {
  try {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Add content to PDF
    doc.fontSize(16).text("On-Duty Request Letter", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Student Name: ${odRequest.student.name}`);
    doc.text(`Register Number: ${odRequest.student.registerNo}`);
    doc.text(`Department: ${odRequest.student.department}`);
    doc.text(`Year: ${odRequest.student.year}`);
    // Add this line for event type
    doc.text(`Event Type: ${odRequest.eventType}`);
    doc.moveDown();
    doc.text(`Event Name: ${odRequest.eventName}`);
    doc.text(
      `Event Date: ${new Date(odRequest.eventDate).toLocaleDateString()}`
    );
    doc.text(
      `Start Date: ${new Date(odRequest.startDate).toLocaleDateString()}`
    );
    doc.text(`End Date: ${new Date(odRequest.endDate).toLocaleDateString()}`);
    if (odRequest.timeType === "particularHours") {
      doc.text(`Start Time: ${odRequest.startTime}`);
      doc.text(`End Time: ${odRequest.endTime}`);
    }
    doc.moveDown();
    doc.text(`Reason: ${odRequest.reason}`);
    doc.moveDown();
    doc.text(
      "This is to certify that the above student was on official duty during the specified period."
    );
    doc.moveDown();
    doc.text(`Verified by: ${odRequest.facultyAdvisor.name}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  } catch (error) {
    console.error("Error generating OD letter:", error);
    throw error;
  }
};

// Helper function to ensure directories exist
const ensureDirectoriesExist = () => {
  const dirs = ["uploads/proofs", "uploads/od_letters"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Call this when the server starts
ensureDirectoriesExist();

// @desc    Get all OD requests for admin
// @route   GET /api/od-requests/admin/all
// @access  Private/Admin
router.get(
  "/admin/all",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(401);
      throw new Error("Not authorized as admin");
    }

    const odRequests = await ODRequest.find()
      .populate("student", "name email department year registerNo")
      .populate("classAdvisor", "name email")
      .populate("hod", "name email")
      .sort({ createdAt: -1 });

    res.json(odRequests);
  })
);

// Helper function to generate approved PDF format
const generateApprovedPDF = async (odRequest, outputPath) => {
  try {
    const doc = new PDFDocument({ margin: 30 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const logoPath = path.join(__dirname, "../assets/anna_univ_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoWidth = 60;
      const logoHeight = 60;
      const leftX = doc.page.margins.left;
      doc.image(logoPath, leftX, doc.page.margins.top + 10, {
        width: logoWidth,
        height: logoHeight,
      });
      doc.moveDown(2.5); // Add space after logo
    }

    // Page border
    doc
      .rect(
        doc.page.margins.left - 5,
        doc.page.margins.top - 5,
        doc.page.width - doc.page.margins.left - doc.page.margins.right + 10,
        doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10
      )
      .stroke();

    // Set initial font
    doc.font("Helvetica").fontSize(9);

    // Header
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("COLLEGE OF ENGINEERING GUINDY", { align: "center" });
    doc.text("Chennai-600025", { align: "center" });
    doc.moveDown(0.7);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ON DUTY APPROVAL FORM", { align: "center" });
    doc.moveDown(1.2);

    // Layout configuration
    const startX = doc.page.margins.left;
    const totalWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const labelWidth = totalWidth * 0.35;
    const valueWidth = totalWidth * 0.65;
    const cellWidths = [labelWidth, valueWidth];
    let currentY = doc.y;
    const rowHeight = 25;
    let itemCounter = 1;

    // Helper function with borders
    const drawLabeledRow = (label, value) => {
      drawTableRowContent(
        doc,
        [`${itemCounter++}. ${label}`, value],
        cellWidths,
        startX,
        currentY,
        rowHeight,
        false,
        true
      );
      currentY += rowHeight + 2; // Add spacing between rows
    };

    // Student + Purpose Details
    drawLabeledRow("Name:", odRequest.student.name);
    drawLabeledRow("Register Number:", odRequest.student.registerNo || "N/A");
    drawLabeledRow("Department:", odRequest.student.department);
    drawLabeledRow("Year:", odRequest.student.year);
    drawLabeledRow("Event Type:", odRequest.eventType);
    drawLabeledRow("Event Name:", odRequest.eventName);
    drawLabeledRow("Reason:", odRequest.reason);

    const daysRequired =
      Math.ceil(
        (new Date(odRequest.endDate) - new Date(odRequest.startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    drawLabeledRow(
      "No. of OD Days required:",
      `${daysRequired} day(s) from ${new Date(
        odRequest.startDate
      ).toLocaleDateString()} to ${new Date(
        odRequest.endDate
      ).toLocaleDateString()}`
    );

    drawLabeledRow(
      "Authority Sanctioning the OD:",
      `${odRequest.classAdvisor.name} (Class Advisor) and ${odRequest.hod.name} (HOD)`
    );
    drawLabeledRow("Date of Sanction:", new Date().toLocaleDateString());

    // Add time information based on timeType
    if (odRequest.timeType === "particularHours") {
      const startTimeStr = odRequest.startTime
        ? new Date(odRequest.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      const endTimeStr = odRequest.endTime
        ? new Date(odRequest.endTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      drawLabeledRow(
        "No. of OD Full days/Half Days Availed:",
        `Particular Hours (${startTimeStr} to ${endTimeStr})`
      );
    } else {
      drawLabeledRow("No. of OD Full days/Half Days Availed:", "Full Day");
    }
    currentY += rowHeight + 20;
    doc.y = currentY;

    doc.moveDown(2); // Add extra space before signature section

    // Signature Section (no visible table borders)
    const sigX = startX;
    const sigWidth = totalWidth;
    const colWidth = sigWidth / 4; // 4 columns: Student, Class Advisor, HOD, Dean
    let sigY = currentY;
    const sigRowHeight = 20;
    let sigItemCounter = itemCounter;

    // Header row for signatures
    drawTableRowContent(
      doc,
      ["STUDENT", "CLASS ADVISOR", "HOD", "DEAN APPROVAL"],
      [colWidth, colWidth, colWidth, colWidth],
      sigX,
      sigY,
      sigRowHeight,
      true
    );
    sigY += sigRowHeight;

    // Signature Details
    const sigDataY = sigY;
    const textOptions = { width: colWidth, align: "left" };

    // Student
    doc.x = sigX;
    doc.y = sigDataY;
    doc.font("Helvetica").text(`Name: ${odRequest.student.name}`, textOptions);
    const studentSigEndY = doc.y;

    // Class Advisor
    doc.x = sigX + colWidth;
    doc.y = sigDataY;
    doc
      .font("Helvetica")
      .text(`Name: ${odRequest.classAdvisor.name}`, textOptions);
    doc.moveDown(0.5);
    doc.text(
      `Date: ${
        odRequest.advisorApprovedAt
          ? new Date(odRequest.advisorApprovedAt).toLocaleDateString()
          : "-"
      }`,
      textOptions
    );
    doc.font("Helvetica-Bold").text("DIGITALLY SIGNED", textOptions);
    const classAdvisorSigEndY = doc.y;

    // HOD
    doc.x = sigX + colWidth * 2;
    doc.y = sigDataY;
    doc.font("Helvetica").text(`Name: ${odRequest.hod.name}`, textOptions);
    doc.moveDown(0.5);
    doc.text(
      `Date: ${
        odRequest.hodApprovedAt
          ? new Date(odRequest.hodApprovedAt).toLocaleDateString()
          : "-"
      }`,
      textOptions
    );
    doc.font("Helvetica-Bold").text("DIGITALLY SIGNED", textOptions);
    const hodSigEndY = doc.y;

    // Dean (no name, no signature text)
    doc.x = sigX + colWidth * 3;
    doc.y = sigDataY;
    doc.text("", textOptions);
    const deanSigEndY = doc.y;

    // No borders for signature section
    // ... existing code ...

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  } catch (error) {
    console.error("Error generating approved PDF:", error);
    throw error;
  }
};

// Serve brochure files statically
router.use(
  "/uploads/brochures",
  express.static(path.join(__dirname, "../uploads/brochures"))
);

module.exports = router;
