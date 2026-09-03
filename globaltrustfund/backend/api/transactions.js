const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { isConfigured } = require('../supabase');
const transactionService = require('../service/transactionService');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const transactions = await transactionService.listForUser(req.user, { limit });
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
