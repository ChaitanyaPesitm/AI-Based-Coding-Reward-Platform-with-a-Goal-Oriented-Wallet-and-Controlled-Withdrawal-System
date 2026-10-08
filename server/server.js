const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });
dotenv.config({ override: true });

const connectDB = require('./config/db');
const { initSocket } = require('./services/socket');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Security headers (defense in depth alongside the rate limiters)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Never leak internal error details (error.message) to clients in production.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' &&
        Object.prototype.hasOwnProperty.call(body, 'error')) {
      const sanitized = { ...body };
      delete sanitized.error;
      body = sanitized;
    }
    return originalJson(body);
  };
  next();
});

// Global rate limiter (120 req/min per IP)
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/problems', require('./routes/problems'));
app.use('/api/proctor', require('./routes/proctor'));
// Submission router: the write limiter is applied to POST only (inside the
// router) so read endpoints (history, analytics, violators) are never throttled.
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/fraud', require('./routes/fraud'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Coding Reward Platform API is running' });
});

// Database offline graceful fallback middleware
app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoNetworkError' || (err.message && err.message.includes('buffering timed out'))) {
    console.warn('[AI Studio] Database offline — returning fallback response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.BACKEND_PORT || (process.env.PORT === '3000' ? 5001 : (process.env.PORT || 5001));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server & Socket.io running on port ${PORT}`);
  console.log(`📡 API available at http://0.0.0.0:${PORT}/api`);
});
