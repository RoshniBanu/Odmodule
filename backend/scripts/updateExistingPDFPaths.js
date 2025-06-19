const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the ODRequest model
const ODRequest = require('../models/ODRequest');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/od-application')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function updateExistingPDFPaths() {
  try {
    console.log('Starting to update existing PDF paths...');
    
    // Get all OD requests that have proofVerified = true but no odLetterPath
    const odRequests = await ODRequest.find({
      proofVerified: true,
      $or: [
        { odLetterPath: { $exists: false } },
        { odLetterPath: null }
      ]
    });
    
    console.log(`Found ${odRequests.length} OD requests to update`);
    
    let updatedCount = 0;
    
    for (const odRequest of odRequests) {
      const expectedPath = path.join('uploads/od_letters', `od_verification_${odRequest._id}.pdf`);
      
      if (fs.existsSync(expectedPath)) {
        odRequest.odLetterPath = expectedPath;
        await odRequest.save();
        updatedCount++;
        console.log(`Updated OD request ${odRequest._id} with path: ${expectedPath}`);
      } else {
        console.log(`PDF file not found for OD request ${odRequest._id}: ${expectedPath}`);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} OD requests`);
    
  } catch (error) {
    console.error('Error updating PDF paths:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
updateExistingPDFPaths(); 