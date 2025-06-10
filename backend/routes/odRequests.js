const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  protect,
  faculty,
  student,
  hod,
} = require("../middleware/authMiddleware");
const ODRequest = require("../models/ODRequest");
const User = require("../models/User");

// Helper function to draw a table row with cell content (no borders drawn by this function)
function drawTableRowContent(doc, data, cellWidths, startX, currentY, rowHeight, isHeader = false) {
    doc.y = currentY; // Set the starting Y for this row
    let x_cursor = startX;

    // Set font for text
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');

    for (let i = 0; i < data.length; i++) {
        const text_content = data[i];
        const cell_width = cellWidths[i];

        // Calculate text position to center vertically and add padding
        const text_x = x_cursor + 5;
        const text_y = currentY + (rowHeight - doc.currentLineHeight()) / 2;
        doc.text(text_content, text_x, text_y, {
            'width': cell_width - 10,
            'align': 'left',
            'valign': 'middle',
            'lineGap': 0 // Ensure no extra line spacing
        });

        x_cursor += cell_width;
    }
    return currentY; // Return original Y as this function doesn't manage row height advancement
}

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
    console.log("OD Request status updated by faculty:", updatedRequest);
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
        .populate("student", "name email registerNo")
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
      .populate("hod", "name");

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    // Check if the user is an HOD in the student's department
    if (req.user.department !== odRequest.student.department.toString()) {
      res.status(401);
      throw new Error("Not authorized to approve requests for this department");
    }

    odRequest.hodStatus = status;
    odRequest.remarks = remarks;
    odRequest.updatedAt = Date.now();

    // If HOD approves, update the overall status as well
    if (status === "approved") {
      odRequest.status = "approved_by_hod";
    }

    const updatedRequest = await odRequest.save();

    console.log("OD Request status updated by HOD:", updatedRequest);

    if (updatedRequest.hodStatus === "approved") {
      const doc = new PDFDocument({ margin: 30 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=od_request_${updatedRequest._id}.pdf`
      );
      
      doc.pipe(res);

      function drawTableRowContent(doc, columns, widths, x, y, height, isHeader = false) {
        doc.rect(x, y, widths[0] + widths[1], height).stroke(); // Outer box
      
        // Draw vertical line between columns
        doc.moveTo(x + widths[0], y).lineTo(x + widths[0], y + height).stroke();
      
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(10)
           .text(columns[0], x + 5, y + 8, { width: widths[0] - 10 });
      
        doc.text(columns[1], x + widths[0] + 5, y + 8, { width: widths[1] - 10 });
      }
      // Page border
      doc.rect(doc.page.margins.left - 5, doc.page.margins.top - 5, doc.page.width - doc.page.margins.left - doc.page.margins.right + 10, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10).stroke();
      
      // Set initial font
      doc.font('Helvetica').fontSize(10);
      
      // Header
      doc.fontSize(10).font('Helvetica-Bold').text('COLLEGE OF ENGINEERING GUINDY', { align: 'center' });
      doc.text('Chennai-600025', { align: 'center' });
      doc.moveDown(0.7);
      
      doc.fontSize(14).font('Helvetica-Bold').text('ON DUTY APPROVAL FORM', { align: 'center' });
      doc.moveDown(1.2);
      
      // Layout configuration
      const startX = doc.page.margins.left;
      const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const labelWidth = totalWidth * 0.35;
      const valueWidth = totalWidth * 0.65;
      const cellWidths = [labelWidth, valueWidth];
      let currentY = doc.y;
      const rowHeight = 25;
      let itemCounter = 1;
      
      // Helper function with borders
      const drawLabeledRow = (label, value) => {
        drawTableRowContent(doc, [`${itemCounter++}. ${label}`, value], cellWidths, startX, currentY, rowHeight, false, true);
        currentY += rowHeight + 2; // Add spacing between rows
      };
      
      // Student + Purpose Details
      drawLabeledRow('Name:', updatedRequest.student.name);
      drawLabeledRow('Register Number:', updatedRequest.student.registerNo || 'N/A');
      drawLabeledRow('Department:', updatedRequest.student.department);
      drawLabeledRow('Year:', updatedRequest.student.year);
      drawLabeledRow('OD For What Purpose:', updatedRequest.reason);
      
      const daysRequired = Math.ceil((new Date(updatedRequest.endDate) - new Date(updatedRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      drawLabeledRow('No. of OD Days required:', `${daysRequired} day(s) from ${new Date(updatedRequest.startDate).toLocaleDateString()} to ${new Date(updatedRequest.endDate).toLocaleDateString()}`);
      
      drawLabeledRow('Authority Sanctioning the OD:', `${updatedRequest.classAdvisor.name} (Class Advisor) and ${updatedRequest.hod.name} (HOD)`);
      drawLabeledRow('Date of Sanction:', new Date().toLocaleDateString());
      drawLabeledRow('No. of OD Full days/Half Days Availed:', 'One full day');
      
      doc.moveDown(2); // Space before signatures
      
      // Signature Section
      const sigX = startX;
      const sigWidth = totalWidth;
      const colWidth = sigWidth / 3;
      let sigY = doc.y;
      const sigRowHeight = 20;
      const sigContentHeight = 50;
      
      // Header row
      drawTableRowContent(doc, ['CLASS ADVISOR', 'HOD', 'STUDENT'], 
                          [colWidth, colWidth, colWidth],
                          sigX, sigY, sigRowHeight, true);
      sigY += sigRowHeight;
      
      // Signature Details
      const sigDataY = sigY;
      const textOptions = { width: colWidth, align: 'left' };
      
      // Class Advisor
      doc.x = sigX;
      doc.y = sigDataY;
      doc.font('Helvetica').text(`Name: ${updatedRequest.classAdvisor.name}`, textOptions);
      doc.moveDown(0.5);
      doc.text('', textOptions);
      if (['approved_by_advisor', 'approved_by_hod'].includes(updatedRequest.status)) {
        doc.font('Helvetica-Bold').text('VIRTUALLY APPROVED', textOptions);
      }
      const classEndY = doc.y;
      
      // HOD
      doc.x = sigX + colWidth;
      doc.y = sigDataY;
      doc.font('Helvetica').text(`Name: ${updatedRequest.hod.name}`, textOptions);
      doc.moveDown(0.5);
      doc.text('', textOptions);
      if (updatedRequest.status === 'approved_by_hod') {
        doc.font('Helvetica-Bold').text('VIRTUALLY APPROVED', textOptions);
      }
      const hodEndY = doc.y;
      
      // Student
      doc.x = sigX + colWidth * 2;
      doc.y = sigDataY;
      doc.font('Helvetica').text(`Name: ${updatedRequest.student.name}`, textOptions);
      doc.moveDown(0.5);
      doc.text('Signature of the student', textOptions);
      const studentEndY = doc.y;
      
      // Bottom Border
      const maxY = Math.max(classEndY, hodEndY, studentEndY);
      doc.moveTo(sigX, maxY).lineTo(sigX + sigWidth, maxY).stroke();
      
      doc.end();
      
 
      

      // Ensure the response is finalized only after the PDF stream ends
      doc.on('end', () => {
        res.end();
      });
    } else {
      res.json(updatedRequest);
    }
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
    const odRequest = await ODRequest.findById(req.params.id);
    console.log("HOD rejecting request with ID:", req.params.id);

    if (!odRequest) {
      res.status(404);
      throw new Error("OD request not found");
    }

    if (req.user.role !== "hod" || req.user.department !== odRequest.department) {
      console.error("HOD authorization failed. User Role:", req.user.role, "User Department:", req.user.department, "Request Department:", odRequest.department);
      res.status(403);
      throw new Error("Not authorized as HOD for this department");
    }

    odRequest.status = "rejected";
    odRequest.hodComment = req.body.comment || "";
    odRequest.updatedAt = Date.now();

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
    doc.rect(doc.page.margins.left - 5, doc.page.margins.top - 5, doc.page.width - doc.page.margins.left - doc.page.margins.right + 10, doc.page.height - doc.page.margins.top - doc.page.margins.bottom + 10).stroke();

    // Set initial font and size for general text
    doc.font('Helvetica').fontSize(10);

    // University Header
    doc.fontSize(10).font('Helvetica-Bold').text('COLLEGE OF ENGINEERING GUINDY', { align: 'center' });
    doc.text('Chennai-600025', { align: 'center' });
    doc.moveDown(0.7); // Adjusted for slightly more space

    // ON DUTY title
    doc.fontSize(14).font('Helvetica-Bold').text('ON DUTY APPROVAL FORM', { align: 'center' });
    doc.moveDown(1.5); // More space after title

    // STUDENT DETAILS Section as a Table
    // doc.fontSize(10).font('Helvetica-Bold').text('STUDENT DETAILS',{ align: 'center' }); // Removed: Merging with Purpose
    // doc.moveDown(0.5); // Removed: Merging with Purpose

    const studentDetailsStartX = doc.page.margins.left;
    const studentDetailsTotalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const studentDetailsLabelWidth = studentDetailsTotalWidth * 0.3; // 30% for label
    const studentDetailsValueWidth = studentDetailsTotalWidth * 0.7; // 70% for value
    const studentDetailsCellWidths = [studentDetailsLabelWidth, studentDetailsValueWidth];
    let studentDetailsCurrentY = doc.y; // Start from here after title spacing
    const studentDetailsRowHeight = 20;
    let itemCounter = 1; // Renamed to a more general counter

    // Header row for Student Details (optional, can be removed if not desired in combined section)
    // drawTableRowContent(doc, ['Field', 'Value'], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight, true); // Removed: Merging with Purpose
    // studentDetailsCurrentY += studentDetailsRowHeight; 

    // Data rows for Student Details
    drawTableRowContent(doc, [`${itemCounter++}. Name:`, odRequest.student.name], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight);
    studentDetailsCurrentY += studentDetailsRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. Register Number:`, odRequest.student.registerNo || 'N/A'], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight);
    studentDetailsCurrentY += studentDetailsRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. Department:`, odRequest.student.department], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight);
    studentDetailsCurrentY += studentDetailsRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. Year:`, odRequest.student.year], studentDetailsCellWidths, studentDetailsStartX, studentDetailsCurrentY, studentDetailsRowHeight);
    studentDetailsCurrentY += studentDetailsRowHeight; 

    // doc.moveDown(1); // Removed: continuous flow

    // PURPOSE Section (now combined with Student Details)
    // doc.fontSize(10).font('Helvetica-Bold').text('PURPOSE'); // Removed this heading
    // doc.moveDown(0.5); // Removed this

    const purposeStartX = doc.page.margins.left; // Still use to define start of its own section
    const purposeTotalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const purposeLabelWidth = purposeTotalWidth * 0.35; // 35% for label
    const purposeValueWidth = purposeTotalWidth * 0.65; // 65% for value
    const purposeCellWidths = [purposeLabelWidth, purposeValueWidth];
    let purposeCurrentY = studentDetailsCurrentY; // Continue from where student details left off
    const purposeRowHeight = 20;

    // No header row for Purpose section since it's continuous
    // drawTableRowContent(doc, ['Field', 'Value'], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight, true); // Removed this
    // purposeCurrentY += purposeRowHeight; 

    // Data rows for Purpose
    drawTableRowContent(doc, [`${itemCounter++}. OD For What Purpose:`, odRequest.reason], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight); // Re-added this field in correct order
    purposeCurrentY += purposeRowHeight; 

    const daysRequired = Math.ceil((new Date(odRequest.endDate) - new Date(odRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    drawTableRowContent(doc, [`${itemCounter++}. No. of OD Days required:`, `${daysRequired} day(s) from ${new Date(odRequest.startDate).toLocaleDateString()} to ${new Date(odRequest.endDate).toLocaleDateString()}`], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight);
    purposeCurrentY += purposeRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. Authority Sanctioning the OD:`, `${odRequest.classAdvisor.name} (Class Advisor) and ${odRequest.hod.name} (HOD)`], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight);
    purposeCurrentY += purposeRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. Date of Sanction:`, new Date().toLocaleDateString()], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight);
    purposeCurrentY += purposeRowHeight; 

    drawTableRowContent(doc, [`${itemCounter++}. No. of OD Full days/Half Days Availed:`, 'One day -'], purposeCellWidths, purposeStartX, purposeCurrentY, purposeRowHeight);
    purposeCurrentY += purposeRowHeight; 

    doc.moveDown(2); // More space before signatures

    // Signatures and Approvals Table
    const signaturesStartX = doc.page.margins.left;
    const signaturesTotalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const signatureColWidth = signaturesTotalWidth / 3; // Three equal columns
    let signaturesCurrentY = doc.y;
    const signatureHeaderHeight = 20; // Height for signature header row
    const signatureContentHeight = 50; // Height for content cells below header

    // Draw top horizontal line for the signature table
    // doc.moveTo(signaturesStartX, signaturesCurrentY).lineTo(signaturesStartX + signaturesTotalWidth, signaturesCurrentY).stroke();

    // Header row for signatures
    drawTableRowContent(doc, ['CLASS ADVISOR', 'HOD', 'STUDENT'], 
                                          [signatureColWidth, signatureColWidth, signatureColWidth],
                                          signaturesStartX, signaturesCurrentY, signatureHeaderHeight, true); 
    signaturesCurrentY += signatureHeaderHeight;
    // doc.moveTo(signaturesStartX, signaturesCurrentY).lineTo(signaturesStartX + signaturesTotalWidth, signaturesCurrentY).stroke(); // Draw line after header

    // Data rows for signatures
    const signatureDataStartY = signaturesCurrentY; // Capture Y after header

    // Class Advisor Column
    doc.x = signaturesStartX;
    doc.y = signatureDataStartY; 
    doc.font('Helvetica').text(`Name: ${odRequest.classAdvisor.name}`, { width: signatureColWidth, align: 'left' });
    doc.moveDown(0.5); // Space between name and line
    // doc.moveTo(doc.x, doc.y).lineTo(doc.x + signatureColWidth - 10, doc.y).stroke(); // Signature line
    doc.text('', { width: signatureColWidth, align: 'left' }); // Blank line for spacing
    if (odRequest.status === "approved_by_advisor" || odRequest.status === "approved_by_hod") {
        doc.font('Helvetica-Bold').text('VIRTUALLY APPROVED', { width: signatureColWidth, align: 'left' });
    }
    const classAdvisorEndY = doc.y; // End Y of this column

    // HOD Column
    doc.x = signaturesStartX + signatureColWidth;
    doc.y = signatureDataStartY;
    doc.font('Helvetica').text(`Name: ${odRequest.hod.name}`, { width: signatureColWidth, align: 'left' });
    doc.moveDown(0.5); // Space between name and line
    // doc.moveTo(doc.x, doc.y).lineTo(doc.x + signatureColWidth - 10, doc.y).stroke(); // Signature line
    doc.text('', { width: signatureColWidth, align: 'left' }); // Blank line for spacing
    if (odRequest.status === "approved_by_hod") {
        doc.font('Helvetica-Bold').text('VIRTUALLY APPROVED', { width: signatureColWidth, align: 'left' });
    }
    const hodEndY = doc.y; // End Y of this column

    // Student Column
    doc.x = signaturesStartX + (signatureColWidth * 2);
    doc.y = signatureDataStartY;
    doc.font('Helvetica').text(`Name: ${odRequest.student.name}`, { width: signatureColWidth, align: 'left' });
    doc.moveDown(0.5); // Space between name and line
    // doc.moveTo(doc.x, doc.y).lineTo(doc.x + signatureColWidth - 10, doc.y).stroke(); // Signature line
    doc.text('Signature of the student', { width: signatureColWidth, align: 'left' });
    const studentEndY = doc.y; // End Y of this column

    // Find the maximum Y position to draw the bottom border and vertical lines
    const maxSignatureColumnY = Math.max(classAdvisorEndY, hodEndY, studentEndY);
    const finalSignatureY = Math.max(maxSignatureColumnY, signatureDataStartY + signatureContentHeight); // Ensure minimum content height

    // Draw vertical lines for the signature table
    // doc.moveTo(signaturesStartX, signatureDataStartY - signatureHeaderHeight).lineTo(signaturesStartX, finalSignatureY).stroke(); // Left-most vertical line
    // doc.moveTo(signaturesStartX + signatureColWidth, signatureDataStartY - signatureHeaderHeight).lineTo(signaturesStartX + signatureColWidth, finalSignatureY).stroke(); // Vertical line between Col1 and Col2
    // doc.moveTo(signaturesStartX + (signatureColWidth * 2), signatureDataStartY - signatureHeaderHeight).lineTo(signaturesStartX + (signatureColWidth * 2), finalSignatureY).stroke(); // Vertical line between Col2 and Col3
    // doc.moveTo(signaturesStartX + (signatureColWidth * 3), signatureDataStartY - signatureHeaderHeight).lineTo(signaturesStartX + (signatureColWidth * 3), finalSignatureY).stroke(); // Right-most vertical line

    // Draw bottom horizontal line for the signature table
    // doc.moveTo(signaturesStartX, finalSignatureY).lineTo(signaturesStartX + signaturesTotalWidth, finalSignatureY).stroke();


    doc.end();

    // Ensure the response is finalized only after the PDF stream ends
    doc.on('end', () => {
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
