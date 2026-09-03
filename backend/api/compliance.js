const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { requireRole } = require('../authentication/roleMiddleware');

router.get('/', requireAuth, requireRole(['admin', 'super_admin', 'manager']), async (req, res, next) => {
  try {
    res.status(501).json({ error: 'Not implemented', message: 'Compliance queue' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
