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
const { sendODRequestNotification, sendProofVerificationNotification } = require("../utils/emailService");

async function generateODLetterPDF(odRequest, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting PDF generation for request:', odRequest._id);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add header with institution details
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("INSTITUTION NAME", { align: "center" });
      doc
        .fontSize(16)
        .font("Helvetica")
        .text("Department of " + (odRequest.student?.department || "General"), { align: "center" });
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("On-Duty Leave Application Form", { align: "center" });
      doc.moveDown(1);

      // Add reference number and date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Reference No: OD/${odRequest._id.toString().slice(-6).toUpperCase()}/${new Date().getFullYear()}`, { align: "right" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Date: ${currentDate}`, { align: "right" });
      doc.moveDown(2);

      // Add a line separator
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();
      doc.moveDown(1);

      // Student Details Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("1. STUDENT INFORMATION", { underline: true });
      doc.moveDown(0.5);
      
      const studentDetails = [
        ["Full Name", odRequest.student?.name || "Not provided"],
        ["Register Number", odRequest.student?.registerNo || "Not provided"],
        ["Department", odRequest.student?.department || "Not provided"],
        ["Year of Study", odRequest.student?.year || "Not provided"],
        ["Email", odRequest.student?.email || "Not provided"],
        ["Contact Number", odRequest.student?.phone || "Not provided"]
      ];
      drawEnhancedTable(doc, studentDetails, 50, doc.y);
      doc.moveDown(1);

      // Event Details Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("2. EVENT DETAILS", { underline: true });
      doc.moveDown(0.5);
      
      const eventDetails = [
        ["Event Name", odRequest.eventName || "Not provided"],
        ["Event Date", odRequest.eventDate ? new Date(odRequest.eventDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Not provided"],
        ["OD Start Date", odRequest.startDate ? new Date(odRequest.startDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Not provided"],
        ["OD End Date", odRequest.endDate ? new Date(odRequest.endDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : "Not provided"],
        ["Duration", odRequest.startDate && odRequest.endDate ? `${Math.ceil((new Date(odRequest.endDate) - new Date(odRequest.startDate)) / (1000 * 60 * 60 * 24) + 1)} day(s)` : "Not provided"],
        ["Time Type", odRequest.timeType === 'fullDay' ? 'Full Day' : 'Particular Hours']
      ];

      if (odRequest.timeType === 'particularHours' && odRequest.startTime && odRequest.endTime) {
        eventDetails.push([
          "Start Time", 
          new Date(odRequest.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        ]);
        eventDetails.push([
          "End Time", 
          new Date(odRequest.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        ]);
      }
      
      drawEnhancedTable(doc, eventDetails, 50, doc.y);
      doc.moveDown(1);

      // Reason Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("3. REASON FOR ON-DUTY LEAVE", { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(odRequest.reason || "Not provided", { 
          align: "justify",
          width: 500
        });
      doc.moveDown(1);

      // Supporting Documents Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("4. SUPPORTING DOCUMENTS", { underline: true });
      doc.moveDown(0.5);
      
      const documents = [];
      if (odRequest.brochure) {
        documents.push(["Event Brochure", "✓ Submitted"]);
      } else {
        documents.push(["Event Brochure", "✗ Not Submitted"]);
      }
      
      if (odRequest.proofSubmitted) {
        documents.push(["Proof Document", odRequest.proofVerified ? "✓ Verified" : "✓ Submitted (Pending Verification)"]);
      } else {
        documents.push(["Proof Document", "✗ Not Submitted"]);
      }
      
      drawEnhancedTable(doc, documents, 50, doc.y);
      doc.moveDown(1);

      // Approval Status Section
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("5. APPROVAL STATUS", { underline: true });
      doc.moveDown(0.5);
      
      const statusDetails = [
        ["Current Status", getStatusDisplay(odRequest.status)],
        ["Faculty Advisor", odRequest.classAdvisor ? "✓ Assigned" : "✗ Not Assigned"],
        ["HOD", odRequest.hod ? "✓ Assigned" : "✗ Not Assigned"]
      ];
      
      if (odRequest.advisorComment) {
        statusDetails.push(["Faculty Advisor Comments", odRequest.advisorComment]);
      }
      if (odRequest.hodComment) {
        statusDetails.push(["HOD Comments", odRequest.hodComment]);
      }
      
      drawEnhancedTable(doc, statusDetails, 50, doc.y);
      doc.moveDown(1);

      // Add status note
      if (odRequest.status === 'pending') {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor('#ff6b35')
          .text("📝 Note: Your request is currently pending faculty approval. Please wait for the approval process to complete.", { 
            width: 500,
            align: "justify"
          });
        doc.fillColor('black');
      } else if (odRequest.status === 'approved_by_advisor') {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor('#28a745')
          .text("✅ Note: Your request has been approved by your faculty advisor and is now pending HOD approval.", { 
            width: 500,
            align: "justify"
          });
        doc.fillColor('black');
      } else if (odRequest.status === 'approved_by_hod') {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor('#28a745')
          .text("✅ Note: Your request has been fully approved! You can now submit proof of participation.", { 
            width: 500,
            align: "justify"
          });
        doc.fillColor('black');
      } else if (odRequest.status === 'rejected') {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor('#dc3545')
          .text("❌ Note: Your request has been rejected. Please check the comments above for details.", { 
            width: 500,
            align: "justify"
          });
        doc.fillColor('black');
      }
      doc.moveDown(1);

      // Terms and Conditions
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("TERMS AND CONDITIONS:", { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("1. This On-Duty leave is granted subject to the student's good conduct and academic performance.", { width: 500 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("2. The student must submit proof of participation within 7 days of the event completion.", { width: 500 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("3. Failure to submit proof may result in the cancellation of the granted leave.", { width: 500 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("4. This leave does not exempt the student from any academic responsibilities or assignments.", { width: 500 });
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("5. The institution reserves the right to modify or cancel this leave based on academic requirements.", { width: 500 });
      doc.moveDown(2);

      // Signatures Section
      const signatureY = doc.y > 650 ? doc.y : 650;
      
      // Student Signature
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("____________________", 50, signatureY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Student's Signature", 50, signatureY + 15);
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Date: " + currentDate, 50, signatureY + 30);

      // Faculty Advisor Signature
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("____________________", 300, signatureY);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("Faculty Advisor's Signature", 300, signatureY + 15);
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Date: " + currentDate, 300, signatureY + 30);

      // HOD Signature
      doc
        .fontSize(12)
        .font("Helvetica")
        .text("____________________", 50, signatureY + 80);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text("HOD's Signature", 50, signatureY + 95);
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Date: " + currentDate, 50, signatureY + 110);

      // Footer
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("This document is computer generated and does not require a physical signature.", { align: "center" });
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("Generated on: " + new Date().toLocaleString(), { align: "center" });
      
      console.log('PDF content generated, ending document');
      doc.end();

      stream.on("finish", () => {
        console.log('PDF file written successfully');
        resolve(outputPath);
      });
      stream.on("error", (err) => {
        console.error('Stream error:', err);
        reject(err);
      });
    } catch (error) {
      console.error('Error in PDF generation:', error);
      reject(error);
    }
  });
}

// Helper function to get status display text
function getStatusDisplay(status) {
  const statusMap = {
    'pending': '⏳ Pending Faculty Approval',
    'approved_by_advisor': '✅ Approved by Faculty Advisor',
    'approved_by_hod': '✅ Approved by HOD',
    'rejected': '❌ Rejected',
    'forwarded_to_hod': '📤 Forwarded to HOD',
    'forwarded_to_admin': '📤 Forwarded to Admin'
  };
  return statusMap[status] || status;
}

// Enhanced table drawing function
function drawEnhancedTable(doc, data, x, y) {
  let currentY = y;
  const rowHeight = 25;
  const col1Width = 180;
  const col2Width = 320;

  // Draw table header
  doc
    .rect(x, currentY, col1Width + col2Width, rowHeight)
    .stroke();
  
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Field", x + 5, currentY + 8);
  doc
    .text("Details", x + col1Width + 5, currentY + 8);
  
  currentY += rowHeight;

  // Draw table rows
  data.forEach(([label, value], index) => {
    // Handle null/undefined values
    const displayValue = value || "Not provided";
    
    // Alternate row colors
    if (index % 2 === 0) {
      doc
        .rect(x, currentY, col1Width + col2Width, rowHeight)
        .fillAndStroke('#f8f9fa', '#dee2e6');
    } else {
      doc
        .rect(x, currentY, col1Width + col2Width, rowHeight)
        .stroke();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor('black')
      .text(label, x + 5, currentY + 8);
    
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(displayValue, x + col1Width + 5, currentY + 8, {
        width: col2Width - 10
      });
    
    currentY += rowHeight;
  });

  doc.y = currentY + 10;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on field name
    let dir;
    if (file.fieldname === 'brochure') {
      dir = 'uploads/brochures';
    } else if (file.fieldname === 'proofDocument') {
      dir = 'uploads/proofs';
    } else {
      dir = 'uploads/proofs'; // default
    }
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'brochure') {
      // Brochure: PDF only
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for brochures!'));
      }
    } else if (file.fieldname === 'proofDocument') {
      // Proof: PDF, DOC, DOCX, JPG, JPEG, PNG
      const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, DOCX, JPEG, JPG & PNG files are allowed for proof documents!'));
      }
    } else {
      cb(new Error('Unexpected field name'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @desc    Create new OD request
// @route   POST /api/od-requests
// @access  Private/Student
router.post(
  "/",
  protect,
  student,
  (req, res, next) => {
    upload.single('brochure')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size too large. Please upload a file smaller than 10MB.' });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Unexpected file field. Please ensure you are uploading a brochure file.' });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('Request file:', req.file);
      
      const { eventName, eventDate, startDate, endDate, timeType, startTime, endTime, reason, notifyFaculty } = req.body;
      
      // Validate that brochure is uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'Event brochure is required. Please upload a PDF brochure.' });
      }
      
      // Get the student's details
      const student = await User.findById(req.user._id);
      if (!student || !student.facultyAdvisor) {
        return res.status(400).json({ message: 'Student must have a faculty advisor assigned' });
      }

      // Get HOD details
      const hod = await User.findOne({ role: 'hod', department: student.department });
      if (!hod) {
        return res.status(400).json({ message: 'HOD not found for the department' });
      }

      const odRequest = new ODRequest({
        student: req.user._id,
        eventName,
        eventDate,
        startDate,
        endDate,
        timeType,
        startTime: timeType === 'particularHours' ? startTime : undefined,
        endTime: timeType === 'particularHours' ? endTime : undefined,
        reason,
        brochure: req.file.path,
        facultyAdvisor: student.facultyAdvisor,
        classAdvisor: student.facultyAdvisor, // Using faculty advisor as class advisor
        hod: hod._id,
        department: student.department,
        year: student.year,
        notifyFaculty: notifyFaculty || []
      });

      await odRequest.save();

      // Get faculty advisor details
      const facultyAdvisor = await User.findById(student.facultyAdvisor);
      
      // Send email notification to faculty advisor
      await sendODRequestNotification(
        facultyAdvisor.email,
        {
          name: req.user.name,
          registerNo: req.user.registerNo,
          department: req.user.department,
          year: req.user.year
        },
        {
          eventName,
          eventDate,
          startDate,
          endDate,
          timeType,
          startTime,
          endTime,
          reason
        }
      );

      res.status(201).json(odRequest);
    } catch (error) {
      console.error('Error creating OD request:', error);
      res.status(500).json({ message: 'Error creating OD request', error: error.message });
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

// @desc    Get all OD requests for HOD
// @route   GET /api/od-requests/hod
// @access  Private/HOD
router.get(
  "/hod",
  protect,
  hod,
  asyncHandler(async (req, res) => {
    const odRequests = await ODRequest.find({
      hod: req.user._id,
      status: { $in: ["approved_by_advisor", "forwarded_to_hod"] }, // HOD sees requests approved by advisor or forwarded
    })
      .populate("student", "name email department year")
      .populate("classAdvisor", "name email")
      .sort({ createdAt: -1 });
    res.json(odRequests);
  })
);

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

    const odRequests = await ODRequest.find({})
      .populate("student", "name email department year registerNo")
      .populate("classAdvisor", "name email")
      .populate("hod", "name email")
      .sort({ createdAt: -1 });

    res.json(odRequests);
  })
);

// @desc    Get student statistics for admin
// @route   GET /api/od-requests/admin/student-stats
// @access  Private/Admin
router.get(
  "/admin/student-stats",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(401);
      throw new Error("Not authorized as an admin");
    }

    const studentStats = await User.aggregate([
      { $match: { role: "student" } },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { year: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(studentStats);
  })
);

// @desc    Forward OD request to HOD (for admin)
// @route   PUT /api/od-requests/:id/forward-to-hod
// @access  Private/Admin
router.put(
  '/:id/forward-to-hod',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }

    const odRequest = await ODRequest.findById(req.params.id);

    if (odRequest) {
      odRequest.status = 'forwarded_to_hod';
      odRequest.forwardedToHodAt = Date.now();
      const updatedRequest = await odRequest.save();
      res.json(updatedRequest);
    } else {
      res.status(404);
      throw new Error('OD request not found');
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
    console.log('Verification request body:', req.body);
    
    const { verified } = req.body;
    
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

    odRequest.proofVerified = verified;
    odRequest.proofVerifiedAt = Date.now();
    odRequest.proofVerifiedBy = req.user.id;
    
    // Only change status to approved_by_advisor if proof is verified
    if (verified) {
      odRequest.status = 'approved_by_advisor';
    }

    const updatedRequest = await odRequest.save();

    // Notify student only if proof is verified
    if (verified) {
      try {
        await sendProofVerificationNotification(
          [odRequest.student.email], // Pass as array
          {
            name: odRequest.student.name,
            registerNo: odRequest.student.registerNo,
            department: odRequest.student.department,
            year: odRequest.student.year
          },
          {
            eventName: odRequest.eventName,
            eventDate: odRequest.eventDate,
            startDate: odRequest.startDate,
            endDate: odRequest.endDate,
            timeType: odRequest.timeType,
            startTime: odRequest.startTime,
            endTime: odRequest.endTime,
            reason: odRequest.reason
          },
          odRequest.proofDocument,
          odRequest.odLetterPath
        );
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json(updatedRequest);
  })
);

// @desc    Submit proof for an OD request
// @route   PUT /api/od-requests/:id/submit-proof
// @access  Private/Student
router.put(
  "/:id/submit-proof",
  protect,
  student,
  (req, res, next) => {
    upload.single("proofDocument")(req, res, (err) => {
      if (err) {
        console.error('Multer error in proof submission:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size too large. Please upload a file smaller than 10MB.' });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Unexpected file field. Please ensure you are uploading a proof file.' });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    console.log('Proof submission - Request body:', req.body);
    console.log('Proof submission - Request file:', req.file);
    
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (odRequest.student.toString() !== req.user.id.toString()) {
      res.status(401);
      throw new Error("Not authorized");
    }

    if (!req.file) {
      res.status(400);
      throw new Error("Proof document is required");
    }

    odRequest.proofDocument = req.file.path;
    odRequest.proofSubmitted = true;
    const updatedRequest = await odRequest.save();

    res.json(updatedRequest);
  })
);

// @desc    Get OD request by ID
// @route   GET /api/od-requests/:id
// @access  Private
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const odRequest = await ODRequest.findById(req.params.id)
      .populate("student", "name email department year")
      .populate("classAdvisor", "name email")
      .populate("hod", "name email")
      .populate("notifyFaculty", "name email");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    res.json(odRequest);
  })
);

// @desc    Update OD request status (for faculty and HOD)
// @route   PUT /api/od-requests/:id/status
// @access  Private/Faculty or Private/HOD
router.put(
  "/:id/status",
  protect,
  asyncHandler(async (req, res) => {
    const { status, comment } = req.body;
    const odRequest = await ODRequest.findById(req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    const isClassAdvisor = odRequest.classAdvisor.toString() === req.user.id.toString();
    const isHod = odRequest.hod.toString() === req.user.id.toString();

    if (!isClassAdvisor && !isHod) {
      res.status(401);
      throw new Error("Not authorized to update this request");
    }

    if (isClassAdvisor) {
      odRequest.advisorComment = comment;
    }

    if (isHod) {
      odRequest.hodComment = comment;
    }

    odRequest.status = status;
    const updatedRequest = await odRequest.save();
    res.json(updatedRequest);
  })
);

// @desc    Request for OD letter
// @route   GET /api/od-requests/:id/request-letter
// @access  Private/Student
router.get(
  "/:id/request-letter",
  protect,
  asyncHandler(async (req, res) => {
    console.log('Request letter generation - Request ID:', req.params.id);
    console.log('Request letter generation - User ID:', req.user.id);
    
    try {
      const odRequest = await ODRequest.findById(req.params.id)
        .populate("student", "name email registerNo department year phone")
        .populate("classAdvisor", "name email")
        .populate("hod", "name email");

      if (!odRequest) {
        console.log('OD request not found');
        return res.status(404).json({ message: "OD request not found" });
      }

      console.log('OD request found:', {
        id: odRequest._id,
        status: odRequest.status,
        studentId: odRequest.student?._id,
        studentName: odRequest.student?.name
      });

      // Check if user is the student who made the request
      if (odRequest.student._id.toString() !== req.user.id.toString()) {
        console.log('User not authorized - Student ID:', odRequest.student._id, 'User ID:', req.user.id);
        return res.status(401).json({ message: "Not authorized" });
      }

      // Allow download for all statuses - students should be able to download their request at any stage
      const dir = 'uploads/od_letters';
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
      }
      
      const outputPath = path.join(dir, `OD_Letter_${odRequest._id}.pdf`);
      console.log('Generating PDF at path:', outputPath);
      
      await generateODLetterPDF(odRequest, outputPath);
      odRequest.odLetterPath = outputPath;
      await odRequest.save();
      console.log('PDF generated successfully');
      res.download(outputPath);
    } catch (error) {
      console.error("Error in request-letter route:", error);
      res.status(500).json({ message: "Failed to generate OD letter: " + error.message });
    }
  })
);

module.exports = router; 