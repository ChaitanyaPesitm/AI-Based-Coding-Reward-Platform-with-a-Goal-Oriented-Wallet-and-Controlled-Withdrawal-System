const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Compute a user's current wallet balance from the authoritative counters:
 * total earned minus withdrawn.
 */
async function currentBalance(userId) {
  const user = await User.findById(userId, 'totalPointsEarned withdrawnPoints');
  if (!user) return 0;
  return Math.max(0, (user.totalPointsEarned || 0) - (user.withdrawnPoints || 0));
}

/**
 * Append a single immutable entry to the reward ledger.
 *
 * @param {Object} opts
 * @param {ObjectId} opts.user            - user the points belong to
 * @param {'earn'|'spend'|'adjust'} opts.type
 * @param {Number}  opts.amount           - signed point movement
 * @param {String}  opts.source           - ledger source enum
 * @param {Object}  [opts.reference]      - { model, id } pointer to Submission/Withdrawal
 * @param {String}  [opts.description]
 * @param {Object}  [opts.metadata]
 * @param {ObjectId}[opts.recordedBy]     - admin that caused the entry (adjustments)
 */
async function recordTransaction({ user, type, amount, source, reference, description, metadata, recordedBy }) {
  if (!user) throw new Error('recordTransaction requires a user');
  const balanceAfter = await currentBalance(user);
  return Transaction.create({
    user,
    type,
    amount,
    source,
    reference,
    description: description || '',
    metadata: metadata || {},
    balanceAfter,
    recordedBy
  });
}

module.exports = { recordTransaction, currentBalance };
