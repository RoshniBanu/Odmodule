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
    const { name, email, password, role, department, year } = req.body;

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

    if (role === "student" && !year) {
      res.status(400);
      throw new Error("Year is required for students");
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      res.status(400);
      throw new Error("User already exists");
    }

    try {
      user = new User({
        name,
        email,
        password,
        role,
        department,
        year,
      });

      await user.save();
      console.log("User saved successfully:", user._id);

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1h" }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          year: user.year,
        },
      });
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      if (saveError.name === "ValidationError") {
        const errors = Object.keys(saveError.errors).map(
          (key) => saveError.errors[key].message
        );
        res.status(400);
        throw new Error(`Validation Error: ${errors.join(", ")}`);
      } else {
        res.status(500);
        throw new Error("Failed to register user: " + saveError.message);
      }
    }
  })
);

module.exports = router;
