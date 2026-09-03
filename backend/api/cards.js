const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    res.status(501).json({ error: 'Not implemented', message: 'List cards' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
