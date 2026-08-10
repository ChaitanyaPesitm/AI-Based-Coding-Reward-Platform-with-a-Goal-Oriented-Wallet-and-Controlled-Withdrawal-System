const Submission = require('../models/Submission');
const Transaction = require('../models/Transaction');

/**
 * Fraud Engine
 *
 * Deterministic, transparent scoring of a user's account for gaming signals.
 * Every signal is additive and capped at 100. The `reasons` array explains
 * exactly why a score was reached so admins (and users) can audit it.
 */

function levelFor(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'flagged';
  if (score >= 25) return 'attention';
  return 'clean';
}

/**
 * Evaluate a single user. Runs several independent DB queries; always returns
 * a full shape so the breakdown is visible even for clean accounts.
 *
 * @param {ObjectId} userId
 * @returns {Promise<{score:number, level:string, reasons:Array, summary:string}>}
 */
async function evaluateFraud(userId) {
  const reasons = [];
  let score = 0;

  const [flagged, total, accepted, proctorFlagged, last24hSubs, last24hPoints] = await Promise.all([
    Submission.countDocuments({ user: userId, plagiarismFlag: true }),
    Submission.countDocuments({ user: userId }),
    Submission.countDocuments({ user: userId, status: 'accepted' }),
    Submission.countDocuments({ user: userId, proctorFlagged: true }),
    Submission.countDocuments({ user: userId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    Submission.aggregate([
      { $match: { user: userId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, pts: { $sum: '$pointsEarned' } } }
    ])
  ]);
  const points24h = last24hPoints[0]?.pts || 0;

  // 1. Plagiarism flags — the strongest signal
  if (flagged > 0) {
    const pts = Math.min(45, flagged * 15);
    score += pts;
    reasons.push({
      signal: 'plagiarism',
      severity: flagged >= 3 ? 'critical' : 'high',
      points: pts,
      detail: `${flagged} submission(s) flagged by AI plagiarism detector`
    });
  }

  // 2. Proctoring violations
  if (proctorFlagged > 0) {
    const pts = Math.min(25, proctorFlagged * 8);
    score += pts;
    reasons.push({
      signal: 'proctoring',
      severity: proctorFlagged >= 3 ? 'high' : 'medium',
      points: pts,
      detail: `${proctorFlagged} submission(s) flagged for proctoring violations (tab-switch, copy/paste, idle)`
    });
  }

  // 3. Abnormally high acceptance rate (only meaningful after enough attempts)
  if (total >= 10 && accepted / total > 0.95) {
    const pts = 15;
    score += pts;
    reasons.push({
      signal: 'acceptance_rate',
      severity: 'medium',
      points: pts,
      detail: `Unusually high acceptance rate: ${Math.round((accepted / total) * 100)}% (${accepted}/${total})`
    });
  }

  // 4. Rapid submission velocity
  if (last24hSubs >= 20) {
    const pts = 10 + Math.min(10, Math.floor((last24hSubs - 20) / 10));
    score += pts;
    reasons.push({
      signal: 'rapid_submissions',
      severity: last24hSubs >= 40 ? 'high' : 'medium',
      points: pts,
      detail: `${last24hSubs} submissions in the last 24h (suspicious automated rate)`
    });
  }

  // 5. Unrealistic points velocity
  if (points24h >= 1000) {
    const pts = 15;
    score += pts;
    reasons.push({
      signal: 'points_velocity',
      severity: 'medium',
      points: pts,
      detail: `${points24h} points earned in the last 24h (high velocity)`
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      signal: 'no_suspicion',
      severity: 'low',
      points: 0,
      detail: 'No suspicious patterns detected'
    });
  }

  const capped = Math.min(100, score);
  return {
    score: capped,
    level: levelFor(capped),
    reasons,
    summary: reasons.map(r => r.detail).join('; ')
  };
}

/**
 * Backwards-compatible alias used by the withdrawals route.
 * Returns the same score/notes shape as the old inline runFraudCheck.
 */
async function runFraudCheck(userId) {
  const evalResult = await evaluateFraud(userId);
  return {
    score: evalResult.score,
    level: evalResult.level,
    plagiarismCount: evalResult.reasons
      .filter(r => r.signal === 'plagiarism')
      .reduce((n, r) => n + 1, 0),
    rapidSubmissions: evalResult.reasons.some(r => r.signal === 'rapid_submissions'),
    notes: evalResult.summary,
    reasons: evalResult.reasons
  };
}

/**
 * Ledger summary used by the fraud engine to estimate how many points a user
 * earned without any legitimate submission backing (i.e. fraud_adjustment target).
 */
async function estimateUnexplainedPoints(userId) {
  const [earned, submitted] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userId, type: 'earn', source: { $in: ['submission', 'hint_bonus', 'streak_bonus'] } } },
      { $group: { _id: null, pts: { $sum: '$amount' } } }
    ]),
    Submission.aggregate([
      { $match: { user: userId, pointsEarned: { $gt: 0 } } },
      { $group: { _id: null, pts: { $sum: '$pointsEarned' } } }
    ])
  ]);
  const ledgerPts = earned[0]?.pts || 0;
  const submissionPts = submitted[0]?.pts || 0;
  return { ledgerPts, submissionPts, unexplained: Math.max(0, ledgerPts - submissionPts) };
}

module.exports = { evaluateFraud, runFraudCheck, estimateUnexplainedPoints, levelFor };
