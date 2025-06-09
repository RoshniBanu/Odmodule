const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, admin, hod } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Get all departments (Admin only)
// @route   GET /api/departments
// @access  Private/Admin
router.get('/', protect, admin, asyncHandler(async (req, res) => {
  const departments = await User.distinct('department');
  res.json(departments);
}));

// @desc    Get department faculty (HOD only)
// @route   GET /api/departments/:department/faculty
// @access  Private/HOD
router.get('/:department/faculty', protect, hod, asyncHandler(async (req, res) => {
  if (req.user.department !== req.params.department) {
    res.status(403);
    throw new Error('Not authorized to access this department');
  }
  const faculty = await User.find({
    department: req.params.department,
    role: 'faculty'
  }).select('-password');
  res.json(faculty);
}));

// @desc    Get department students (Faculty only)
// @route   GET /api/departments/:department/students
// @access  Private/Faculty
router.get('/:department/students', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'hod') {
    res.status(403);
    throw new Error('Not authorized to access student data');
  }
  const students = await User.find({
    department: req.params.department,
    role: 'student'
  }).select('-password');
  res.json(students);
}));

// @desc    Add faculty to department (Admin only)
// @route   POST /api/departments/:department/faculty
// @access  Private/Admin
router.post('/:department/faculty', protect, admin, asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    role: 'faculty',
    department: req.params.department
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
}));

module.exports = router; 