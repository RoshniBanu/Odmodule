const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();
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

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`)); 