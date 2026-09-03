const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { requireRole } = require('../authentication/roleMiddleware');

router.get('/', requireAuth, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    res.status(501).json({ error: 'Not implemented', message: 'Audit logs' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
