const express = require('express');
const router = express.Router();
const { requireAuth } = require('../authentication/authMiddleware');
const { isConfigured } = require('../supabase');
const accountService = require('../service/accountService');
const transactionService = require('../service/transactionService');

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      });
    }

    await accountService.ensureStarterAccounts(req.user.id);
    const accounts = await accountService.listForUser(req.user);
    const transactions = await transactionService.listForUser(req.user, { limit: 8 });

    const totalBalance = (accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
    const availableBalance = (accounts || []).reduce((s, a) => s + Number(a.available || 0), 0);
    const pendingCount = (transactions || []).filter((t) => t.status === 'pending').length;
    const currency = accounts?.[0]?.currency || 'USD';

    res.json({
      totalBalance,
      availableBalance,
      accountCount: (accounts || []).length,
      pendingCount,
      currency,
      recent: (transactions || []).slice(0, 5).map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        status: t.status,
        date: t.date
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
