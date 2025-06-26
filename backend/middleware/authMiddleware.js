const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for x-auth-token in headers first (from local storage)
  if (req.header("x-auth-token")) {
    token = req.header("x-auth-token");
  }
  // Otherwise, check for Authorization: Bearer token (if frontend uses this)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.log("No token provided");
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Get user from the token
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("User not found for token");
      res.status(401);
      throw new Error("User not found");
    }

    console.log("Authenticated user:", user);
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

const faculty = (req, res, next) => {
  if (req.user && req.user.role === "faculty") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as a faculty");
  }
};

const student = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as a student");
  }
};

const hod = (req, res, next) => {
  if (req.user && req.user.role === "hod") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as a HOD");
  }
};

module.exports = { protect, faculty, student, hod };
