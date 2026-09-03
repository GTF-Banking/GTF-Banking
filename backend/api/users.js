const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name || null,
      role: req.user.role || 'customer',
      phone: req.user.phone || null,
      kyc_status: req.user.kyc_status || 'pending'
    }
  });
});

module.exports = router;
