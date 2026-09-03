const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Global TrustFund API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true'
  });
});

module.exports = router;
