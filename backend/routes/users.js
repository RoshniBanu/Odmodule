const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

// Public route for faculty list
router.get(
  "/public/faculty",
  asyncHandler(async (req, res) => {
    console.log("Fetching faculty members (public route)...");
    try {
      const faculty = await User.find({ role: "faculty" })
        .select("_id name email")
        .sort({ name: 1 });
      console.log("Found faculty members:", faculty);
      res.json(faculty);
    } catch (error) {
      console.error("Error fetching faculty:", error);
      res
        .status(500)
        .json({
          message: "Error fetching faculty members",
          error: error.message,
        });
    }
  })
);

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not authorized as admin");
    }
    const users = await User.find({});
    res.json(users);
  })
);

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put(
  "/profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        studentId: updatedUser.studentId,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// @desc    Get users by department (HOD only)
// @route   GET /api/users/department/:department
// @access  Private/HOD
router.get(
  "/department/:department",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "hod") {
      res.status(403);
      throw new Error("Not authorized as HOD");
    }
    const users = await User.find({ department: req.params.department });
    res.json(users);
  })
);

// @desc    Get students (Faculty only)
// @route   GET /api/users/students
// @access  Private/Faculty
router.get(
  "/students",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "faculty") {
      res.status(403);
      throw new Error("Not authorized as faculty");
    }
    const students = await User.find({ role: "student" });
    res.json(students);
  })
);

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not authorized as admin");
    }
    const user = await User.findById(req.params.id);
    if (user) {
      await user.remove();
      res.json({ message: "User removed" });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// @route   GET api/users/me
// @desc    Get current user
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  })
);

// @route   PUT api/users/me
// @desc    Update user profile
// @access  Private
router.put(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.name = name || user.name;
    user.email = email || user.email;

    const updatedUser = await user.save();
    res.json(updatedUser);
  })
);

// Get all faculty members
router.get('/faculty', protect, async (req, res) => {
  try {
    const facultyMembers = await User.find({ role: 'faculty' })
      .select('name email department');
    res.json(facultyMembers);
  } catch (error) {
    console.error('Error fetching faculty members:', error);
    res.status(500).json({ message: 'Error fetching faculty members', error: error.message });
  }
});

module.exports = router;
