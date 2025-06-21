const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const jwtSecret = process.env.JWT_SECRET;
require('dotenv').config();
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
const { errorHandler } = require('./middleware/errorMiddleware');

// Connect Database
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/od-requests', require('./routes/odRequests'));
app.use('/api/admin', require('./routes/admin'));

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, filePath) => {
    // Set CORS headers for uploaded files
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // Set appropriate content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.set("Content-Type", "application/pdf");
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      res.set("Content-Type", `image/${ext.slice(1)}`);
    }
  }
}));

// Debug route to check if files exist
app.get("/debug/file/:path(*)", (req, res) => {
  const filePath = path.join(__dirname, req.params.path);
  if (fs.existsSync(filePath)) {
    res.json({ 
      exists: true, 
      path: filePath,
      size: fs.statSync(filePath).size,
      ext: path.extname(filePath)
    });
  } else {
    res.json({ exists: false, path: filePath });
  }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 