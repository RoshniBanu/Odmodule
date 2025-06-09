const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
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
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  })
);

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, role, department, year, facultyAdvisor } =
      req.body;

    console.log("Register request body:", req.body);

    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error("Please fill in all required fields");
    }

    // Validate role-specific fields
    if (["student", "faculty", "hod"].includes(role) && !department) {
      res.status(400);
      throw new Error("Department is required for this role");
    }

    if (role === "student") {
      if (!year) {
        res.status(400);
        throw new Error("Year is required for students");
      }
      if (!facultyAdvisor) {
        res.status(400);
        throw new Error("Faculty advisor is required for students");
      }
      // Verify that the faculty advisor exists and is a faculty member
      const advisor = await User.findOne({
        _id: facultyAdvisor,
        role: "faculty",
      });
      if (!advisor) {
        res.status(400);
        throw new Error("Invalid faculty advisor selected");
      }
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      res.status(400);
      throw new Error("User already exists");
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      role,
      department,
      year,
      facultyAdvisor: role === "student" ? facultyAdvisor : undefined,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        year: user.year,
        facultyAdvisor: user.facultyAdvisor,
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  })
);

module.exports = router;
