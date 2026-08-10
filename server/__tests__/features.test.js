process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connect, disconnect, clearAll } = require('./helpers/db');

const User = require('../models/User');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Transaction = require('../models/Transaction');

const { evaluateFraud, runFraudCheck } = require('../services/fraud');
const { recordTransaction } = require('../services/ledger');
const { buildRecommendations, decideDifficulty } = require('../services/recommendations');

jest.mock('../services/wandbox', () => ({ executeCode: jest.fn() }));
jest.mock('../services/gemini', () => ({ evaluateCode: jest.fn() }));

const submissionsRouter = require('../routes/submissions');
const walletRouter = require('../routes/wallet');

const app = express();
app.use(express.json());
app.use('/api/submissions', submissionsRouter);
app.use('/api/wallet', walletRouter);

const makeUser = (overrides = {}) =>
  User.create({ name: 'Tester', email: `tester+${Date.now()}@test.com`, password: 'pass123', ...overrides });

const makeProblem = (overrides = {}) =>
  Problem.create({
    title: `Prob ${Date.now()}`,
    description: 'desc',
    difficulty: 'easy',
    language: 'python',
    basePoints: 100,
    category: 'arrays',
    expectedTimeComplexity: 'O(n)',
    expectedSpaceComplexity: 'O(n)',
    testCases: [{ input: '1', expectedOutput: '1' }],
    isActive: true,
    ...overrides
  });

const authHeader = (user) => `Bearer ${user.generateToken()}`;

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearAll(); });
afterAll(async () => { await disconnect(); });

describe('Fraud Engine', () => {
  it('returns a clean score for an honest user', async () => {
    const user = await makeUser();
    await Submission.create({ user: user._id, problem: (await makeProblem())._id, code: 'x', language: 'python', status: 'accepted', aiScore: 80, pointsEarned: 100, testCasesPassed: 1, totalTestCases: 1 });

    const result = await evaluateFraud(user._id);
    expect(result.score).toBe(0);
    expect(result.level).toBe('clean');
    expect(result.reasons.some(r => r.signal === 'no_suspicion')).toBe(true);
  });

  it('adds points and reasons for plagiarism flags', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    await Submission.create({ user: user._id, problem: problem._id, code: 'x', language: 'python', plagiarismFlag: true });
    await Submission.create({ user: user._id, problem: problem._id, code: 'y', language: 'python', plagiarismFlag: true });

    const result = await evaluateFraud(user._id);
    expect(result.score).toBe(30);
    expect(result.level).toBe('attention');
    const plag = result.reasons.find(r => r.signal === 'plagiarism');
    expect(plag.points).toBe(30);
    expect(result.summary).toContain('plagiarism');
  });

  it('caps plagiarism signal at 45 so no single signal dominates', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    for (let i = 0; i < 10; i++) {
      await Submission.create({ user: user._id, problem: problem._id, code: `x${i}`, language: 'python', plagiarismFlag: true });
    }
    const result = await evaluateFraud(user._id);
    expect(result.score).toBe(45);
    const plag = result.reasons.find(r => r.signal === 'plagiarism');
    expect(plag.points).toBe(45);
  });

  it('combines signals and caps the total score at 100 (critical)', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    const now = Date.now();
    // 40 flagged + proctored + high-velocity submissions within the last 24h
    for (let i = 0; i < 40; i++) {
      await Submission.create({
        user: user._id,
        problem: problem._id,
        code: `x${i}`,
        language: 'python',
        plagiarismFlag: true,
        proctorFlagged: true,
        status: 'accepted',
        aiScore: 90,
        pointsEarned: 100,
        testCasesPassed: 1,
        totalTestCases: 1,
        createdAt: new Date(now - i * 60 * 1000)
      });
    }
    const result = await evaluateFraud(user._id);
    expect(result.score).toBe(100);
    expect(result.level).toBe('critical');
    const signals = result.reasons.map(r => r.signal);
    expect(signals).toContain('plagiarism');
    expect(signals).toContain('rapid_submissions');
    expect(signals).toContain('points_velocity');
    expect(signals).toContain('proctoring');
  });

  it('runFraudCheck keeps backwards-compatible shape for withdrawals', async () => {
    const user = await makeUser();
    const result = await runFraudCheck(user._id);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('notes');
    expect(result).toHaveProperty('plagiarismCount');
    expect(result).toHaveProperty('rapidSubmissions');
  });
});

describe('Reward Ledger', () => {
  it('records an immutable auditable transaction with balance', async () => {
    const user = await makeUser();
    await User.findByIdAndUpdate(user._id, { totalPointsEarned: 500 });

    const tx = await recordTransaction({
      user: user._id,
      type: 'earn',
      amount: 100,
      source: 'submission',
      reference: { model: 'Submission', id: new mongoose.Types.ObjectId() },
      description: 'Solved "Two Sum"',
      metadata: { aiScore: 85 }
    });

    expect(tx.balanceAfter).toBe(500);
    expect(tx.type).toBe('earn');
    expect(tx.amount).toBe(100);

    await expect(
      Transaction.findByIdAndUpdate(tx._id, { amount: 9999 })
    ).rejects.toThrow('immutable');
  });

  it('wallet history reads from the ledger', async () => {
    const user = await makeUser();
    await User.findByIdAndUpdate(user._id, { totalPointsEarned: 200 });
    await recordTransaction({ user: user._id, type: 'earn', amount: 200, source: 'submission', description: 'Solved "Two Sum"', metadata: { difficulty: 'easy', language: 'python', aiScore: 80 } });
    await recordTransaction({ user: user._id, type: 'spend', amount: -50, source: 'withdrawal', description: 'Withdrawn 50 pts' });

    const res = await request(app)
      .get('/api/wallet/history')
      .set('Authorization', authHeader(user));

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const spend = res.body.data.find(t => t.type === 'spent');
    expect(spend.points).toBe(50);
    const earn = res.body.data.find(t => t.type === 'earned');
    expect(earn.description).toContain('Two Sum');
  });
});

describe('Recommendations', () => {
  it('decideDifficulty moves up when easy is mastered', () => {
    const easy = { attempts: 5, avgAiScore: 85, acceptRate: 0.8 };
    const medium = { attempts: 0, avgAiScore: 0, acceptRate: 0 };
    expect(decideDifficulty(easy, medium, true)).toEqual({ difficulty: 'medium', move: 'up' });
  });

  it('decideDifficulty moves down when medium is failing', () => {
    const easy = { attempts: 5, avgAiScore: 90, acceptRate: 0.9 };
    const medium = { attempts: 5, avgAiScore: 50, acceptRate: 0.2 };
    expect(decideDifficulty(easy, medium, true)).toEqual({ difficulty: 'easy', move: 'down' });
  });

  it('buildRecommendations returns weak areas and ranked problems', async () => {
    const user = await makeUser();
    const hardArr = await makeProblem({ title: 'Hard Array', difficulty: 'hard', category: 'arrays' });
    const medStr = await makeProblem({ title: 'Med String', difficulty: 'medium', category: 'strings' });

    // User struggled with arrays (low AI), nailed strings
    await Submission.create({ user: user._id, problem: hardArr._id, code: 'x', language: 'python', status: 'wrong_answer', aiScore: 30, testCasesPassed: 0, totalTestCases: 1 });
    await Submission.create({ user: user._id, problem: medStr._id, code: 'y', language: 'python', status: 'accepted', aiScore: 90, testCasesPassed: 1, totalTestCases: 1 });

    const result = await buildRecommendations(user._id);
    expect(result.weakAreas.length).toBeGreaterThan(0);
    expect(result.difficultyRecommendation).toHaveProperty('difficulty');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toHaveProperty('reason');
  });
});

describe('GET /api/submissions/analytics', () => {
  it('returns totals and improvement series', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    await Submission.create({ user: user._id, problem: problem._id, code: 'x', language: 'python', status: 'wrong_answer', aiScore: 40, executionTime: 250, testCasesPassed: 0, totalTestCases: 1, pointsEarned: 0 });
    await Submission.create({ user: user._id, problem: problem._id, code: 'y', language: 'python', status: 'accepted', aiScore: 85, executionTime: 120, testCasesPassed: 1, totalTestCases: 1, pointsEarned: 100 });

    const res = await request(app)
      .get('/api/submissions/analytics')
      .set('Authorization', authHeader(user));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.totals.submissions).toBe(2);
    expect(res.body.data.totals.accepted).toBe(1);
    expect(res.body.data.totals.acceptRate).toBe(50);
    expect(res.body.data.totals.avgAiScore).toBe(63); // Math.round((40+85)/2)
    expect(res.body.data.series).toHaveLength(2);
    expect(res.body.data.problemStats).toHaveLength(1);
    expect(res.body.data.problemStats[0].bestAiScore).toBe(85);
  });
});
