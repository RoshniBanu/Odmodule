const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, faculty, student } = require('../middleware/authMiddleware');
const ODRequest = require('../models/ODRequest');
const User = require('../models/User');

// @desc    Create new OD request
// @route   POST /api/od-requests
// @access  Private/Student
router.post('/', protect, student, asyncHandler(async (req, res) => {
  console.log('req.user in OD request creation:', req.user);

  const {
    classAdvisor,
    eventName,
    eventDate,
    startDate,
    endDate,
    reason
  } = req.body;

  // Get student details from auth token
  const studentUser = await User.findById(req.user.id);

  if (!studentUser) {
    res.status(404);
    throw new Error('Student user not found');
  }
  
  const odRequest = await ODRequest.create({
    student: req.user.id,
    classAdvisor,
    department: studentUser.department,
    year: studentUser.year,
    eventName,
    eventDate,
    startDate,
    endDate,
    reason
  });

  res.status(201).json(odRequest);
}));

// @desc    Get student's OD requests
// @route   GET /api/od-requests/my-requests
// @access  Private/Student
router.get('/my-requests', protect, student, asyncHandler(async (req, res) => {
  const odRequests = await ODRequest.find({ student: req.user.id })
    .populate('classAdvisor', 'name email')
    .sort({ createdAt: -1 });
  res.json(odRequests);
}));

// @desc    Get all OD requests for faculty
// @route   GET /api/od-requests/faculty
// @access  Private/Faculty
router.get('/faculty', protect, faculty, asyncHandler(async (req, res) => {
  const odRequests = await ODRequest.find()
    .populate('student', 'name email studentId')
    .sort({ createdAt: -1 });
  res.json(odRequests);
}));

// @desc    Get all OD requests for a class advisor
// @route   GET /api/od-requests/advisor-requests
// @access  Private/ClassAdvisor
router.get('/advisor-requests', protect, faculty, asyncHandler(async (req, res) => {
  const odRequests = await ODRequest.find({ classAdvisor: req.user.id })
    .populate('student', 'name email department year')
    .sort({ createdAt: -1 });
  res.json(odRequests);
}));

// @desc    Update OD request status
// @route   PUT /api/od-requests/:id/status
// @access  Private/Faculty
router.put('/:id/status', protect, faculty, asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const odRequest = await ODRequest.findById(req.params.id);

  if (!odRequest) {
    res.status(404);
    throw new Error('OD request not found');
  }

  // Check if the user is the class advisor
  if (odRequest.classAdvisor.toString() !== req.user.id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  odRequest.status = status;
  odRequest.remarks = remarks;
  odRequest.updatedAt = Date.now();

  const updatedRequest = await odRequest.save();
  res.json(updatedRequest);
}));

// @desc    Submit proof for OD request
// @route   PUT /api/od-requests/:id/proof
// @access  Private/Student
router.put('/:id/proof', protect, student, asyncHandler(async (req, res) => {
  const { proofDocument } = req.body;
  const odRequest = await ODRequest.findById(req.params.id);

  if (!odRequest) {
    res.status(404);
    throw new Error('OD request not found');
  }

  // Check if the user is the student who created the request
  if (odRequest.student.toString() !== req.user.id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Check if the request is approved
  if (odRequest.status !== 'approved') {
    res.status(400);
    throw new Error('Request must be approved before submitting proof');
  }

  odRequest.proofDocument = proofDocument;
  odRequest.proofSubmitted = true;
  odRequest.updatedAt = Date.now();

  const updatedRequest = await odRequest.save();
  res.json(updatedRequest);
}));

// @desc    Verify proof document
// @route   PUT /api/od-requests/:id/verify-proof
// @access  Private/ClassAdvisor
router.put('/:id/verify-proof', protect, faculty, asyncHandler(async (req, res) => {
  const odRequest = await ODRequest.findById(req.params.id);

  if (!odRequest) {
    res.status(404);
    throw new Error('OD request not found');
  }

  // Check if the user is the class advisor
  if (odRequest.classAdvisor.toString() !== req.user.id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  // Check if proof has been submitted
  if (!odRequest.proofSubmitted) {
    res.status(400);
    throw new Error('No proof document submitted yet');
  }

  odRequest.proofVerified = true;
  odRequest.updatedAt = Date.now();

  const updatedRequest = await odRequest.save();
  res.json(updatedRequest);
}));

// @route   GET api/od-requests/student
// @desc    Get all OD requests for logged in student
// @access  Private
router.get('/student', protect, student, async (req, res) => {
  try {
    const requests = await ODRequest.find({ student: req.user.id })
      .populate('classAdvisor', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/od-requests/advisor
// @desc    Get all OD requests for logged in faculty (class advisor)
// @access  Private
router.get('/advisor', protect, faculty, async (req, res) => {
  try {
    const requests = await ODRequest.find({ classAdvisor: req.user.id })
      .populate('student', 'name email')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 