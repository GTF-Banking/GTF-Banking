/**
 * Global TrustFund — Backend Entry Point
 * Express server with security middleware and API routing.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const apiRouter = require('./api/router');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

/* ---------- Security & Core Middleware ---------- */
app.use(helmet({
  contentSecurityPolicy: false // adjust for production
}));

app.use(cors({
  origin: isProd ? process.env.APP_URL : true,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (!isProd) {
  app.use(morgan('dev'));
}

/* ---------- Rate Limiting ---------- */
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

/* ---------- Static Frontend ---------- */
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

/* ---------- API Routes ---------- */
app.use('/api', apiRouter);

/* ---------- SPA-style fallbacks for known areas (optional) ---------- */
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  // Let static serve the actual admin HTML files
  res.status(404).send('Not found');
});

/* ---------- Health (also available under /api/health) ---------- */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Global TrustFund',
    timestamp: new Date().toISOString()
  });
});

/* ---------- Error Handler ---------- */
app.use((err, req, res, next) => {
  console.error('[GTF Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: isProd && status === 500 ? 'Internal server error' : err.message,
    ...(err.details && !isProd ? { details: err.details } : {})
  });
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`\n  Global TrustFund API running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Demo mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}\n`);
});

module.exports = app;
