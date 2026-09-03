const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { isConfigured } = require('../supabase');
const accountService = require('../service/accountService');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      });
    }
    await accountService.ensureStarterAccounts(req.user.id);
    const accounts = await accountService.listForUser(req.user);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    const accounts = await accountService.listForUser(req.user);
    const account = (accounts || []).find((a) => a.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
