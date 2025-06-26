const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes" : "No");
const { errorHandler } = require("./middleware/errorMiddleware");
const mongoose = require("mongoose");
const settingsRoutes = require("./routes/settings.js");

// Connect Database
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/od-requests", require("./routes/odRequests"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/settings", settingsRoutes);

// Serve static files from the uploads directory
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      // Set CORS headers for uploaded files
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
