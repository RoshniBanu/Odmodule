const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware');

// Default system settings
let systemSettings = {
  responseTimeout: 30,
  autoForwardEnabled: true,
  notificationEnabled: true,
};

// @desc    Get system settings
// @route   GET /api/admin/system-settings
// @access  Private/Admin
router.get(
  '/system-settings',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
      res.status(401);
      throw new Error('Not authorized as admin');
    }
    res.json(systemSettings);
  })
);

// @desc    Update system settings
// @route   PUT /api/admin/system-settings
// @access  Private/Admin
router.put(
  '/system-settings',
  protect,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
      res.status(401);
      throw new Error('Not authorized as admin');
    }

    const { responseTimeout, autoForwardEnabled, notificationEnabled } = req.body;

    // Validate response timeout
    if (responseTimeout < 10 || responseTimeout > 300) {
      res.status(400);
      throw new Error('Response timeout must be between 10 and 300 seconds');
    }

    // Update settings
    systemSettings = {
      responseTimeout,
      autoForwardEnabled,
      notificationEnabled,
    };

    res.json(systemSettings);
  })
);

module.exports = router; 