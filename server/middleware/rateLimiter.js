const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints — prevents brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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

// Ad action limiter — impressions/clicks/rewards are high-frequency UI events
// but still must be bounded to stop scripted farming.
const adLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many ad actions. Please slow down.'
  }
});

// AI action limiter — protect Gemini API quotas from spam
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many AI requests. Please slow down.'
  }
});

module.exports = { authLimiter, apiLimiter, submissionLimiter, adLimiter, aiLimiter };
