const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { isConfigured } = require('../supabase');
const transferService = require('../service/transferService');

router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      });
    }
    const result = await transferService.createTransfer(req.user, req.body || {});
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      error: status === 500 ? 'Transfer failed' : err.message,
      message: err.message
    });
  }
});

module.exports = router;
