const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socket');
const { apiLimiter, authLimiter, submissionLimiter } = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

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
app.use('/api/submissions', submissionLimiter, require('./routes/submissions'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Coding Reward Platform API is running' });
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server & Socket.io running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});
