/**
 * Global TrustFund — API Router
 * Single coherent /api root. All routes registered here.
 */

const express = require('express');
const router = express.Router();

const health = require('./health');
const config = require('./config');
const auth = require('./auth');
const users = require('./users');
const accounts = require('./accounts');
const transactions = require('./transactions');
const transfers = require('./transfers');
const payments = require('./payments');
const cards = require('./cards');
const customers = require('./customers');
const compliance = require('./compliance');
const audit = require('./audit');
const dashboard = require('./dashboard');
const support = require('./support');

/* Health */
router.use('/health', health);
router.use('/config', config);

/* Auth */
router.use('/auth', auth);

/* Authenticated resources */
router.use('/users', users);
router.use('/accounts', accounts);
router.use('/transactions', transactions);
router.use('/transfers', transfers);
router.use('/payments', payments);
router.use('/cards', cards);
router.use('/customers', customers);
router.use('/compliance', compliance);
router.use('/audit', audit);
router.use('/dashboard', dashboard);
router.use('/support', support);

/* 404 for unknown API routes */
router.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = router;
