const express = require('express');
const router = express.Router();
const { isConfigured } = require('../supabase');

/** Public client config only — never service role */
router.get('/', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    configured: isConfigured(),
    appName: 'Global TrustFund'
  });
});

module.exports = router;
