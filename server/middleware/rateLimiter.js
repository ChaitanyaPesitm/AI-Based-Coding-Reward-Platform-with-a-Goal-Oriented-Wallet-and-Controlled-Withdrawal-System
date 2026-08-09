const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints — prevents brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});

// General API limiter — applied globally
// Generous for SPAs (pages fire several parallel requests); still blocks real abuse.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded. Please slow down.'
  }
});

// Submission limiter — prevents rapid re-submissions
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions. Please wait before trying again.'
  }
});

module.exports = { authLimiter, apiLimiter, submissionLimiter };
