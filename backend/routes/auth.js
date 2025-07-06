const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Student = require("../models/Student"); // Add this at the top
const asyncHandler = require("express-async-handler");

// @route   GET api/auth/me
// @desc    Get logged in user
// @access  Private
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  })
);

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    try {
      console.log("Login attempt with body:", req.body);
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400);
        throw new Error("Please provide both email and password");
      }

      let user = await User.findOne({ email });
      console.log("User found:", user ? "Yes" : "No");

      if (!user) {
        res.status(400);
        throw new Error("No user found with this email");
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match:", isMatch ? "Yes" : "No");

      if (!isMatch) {
        res.status(400);
        throw new Error("Invalid password");
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables");
        res.status(500);
        throw new Error("Server configuration error");
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      console.log("Login successful for user:", user.email);

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error.message);
      res.status(res.statusCode || 500);
      throw error;
    }
  })
);

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, role, year, facultyAdvisor, registerNo } =
      req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error("Please fill in all required fields");
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      res.status(400);
      throw new Error("User already exists");
    }

    // For students, validate and create Student document
    let student = null;
    if (role === "student") {
      if (!year || !registerNo || !facultyAdvisor) {
        res.status(400);
        throw new Error("All student fields are required");
      }
      // Check if register number already exists
      const existingStudent = await Student.findOne({ registerNo });
      if (existingStudent) {
        res.status(400);
        throw new Error("Student with this Register Number already exists");
      }
      // Verify faculty advisor exists and is a faculty
      const advisor = await User.findOne({
        _id: facultyAdvisor,
        role: "faculty",
      });
      if (!advisor) {
        res.status(400);
        throw new Error("Invalid faculty advisor selected");
      }
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role,
      userId: email, // or however you want to generate userId
    });

    // If student, create Student document
    if (role === "student") {
      student = await Student.create({
        user: user._id,
        registerNo,
        year,
        facultyAdvisor,
      });
    }

    // Respond
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(student && {
        student: {
          registerNo: student.registerNo,
          year: student.year,
          facultyAdvisor: student.facultyAdvisor,
        },
      }),
    });
  })
);

module.exports = router;
