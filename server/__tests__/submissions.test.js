process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connect, disconnect, clearAll } = require('./helpers/db');

const User = require('../models/User');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

// Minimal app — stub out Wandbox and Gemini so tests stay offline
jest.mock('../services/localRunner', () => ({
  executeCode: jest.fn()
}));
jest.mock('../services/gemini', () => ({
  evaluateCode: jest.fn(),
  generateEdgeCases: jest.fn().mockResolvedValue([]),
  getSeniorDevQuestion: jest.fn().mockResolvedValue(null),
  analyzeStyleAnomaly: jest.fn().mockReturnValue({ isAnomaly: false, reason: 'Mocked', severity: 'none' }),
  rubberDuckChat: jest.fn().mockResolvedValue("Quack!")
}));

const { executeCode } = require('../services/localRunner');
const { evaluateCode } = require('../services/gemini');

const submissionsRouter = require('../routes/submissions');

const app = express();
app.use(express.json());
app.use('/api/submissions', submissionsRouter);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeUser = (overrides = {}) =>
  User.create({ name: 'Tester', email: `tester+${Date.now()}@test.com`, password: 'pass123', ...overrides });

const makeProblem = () =>
  Problem.create({
    title: 'Two Sum',
    description: 'Return indices of two numbers that add to target.',
    difficulty: 'easy',
    language: 'python',
    basePoints: 100,
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]' }
    ],
    sampleInput: '[2,7]\n9',
    sampleOutput: '[0,1]',
    isActive: true
  });

const authHeader = (user) => `Bearer ${user.generateToken()}`;

const mockJudgePass = () =>
  executeCode.mockResolvedValue({
    passed: 2, total: 2, allPassed: true, compilationError: null,
    results: [
      { status: 'Accepted', passed: true, time: 100, statusId: 3, input: 'inp' },
      { status: 'Accepted', passed: true, time: 80, statusId: 3, input: 'inp' }
    ]
  });

const mockJudgeFail = () =>
  executeCode.mockResolvedValue({
    passed: 0, total: 2, allPassed: false, compilationError: null,
    results: [
      { status: 'Wrong Answer', passed: false, time: 0, statusId: 4, input: 'inp' },
      { status: 'Wrong Answer', passed: false, time: 0, statusId: 4, input: 'inp' }
    ]
  });

const mockAI = () =>
  evaluateCode.mockResolvedValue({
    aiScore: 80, timeComplexity: 'O(n)', spaceComplexity: 'O(n)',
    codeQuality: 80, efficiency: 80, suggestions: 'Looks good!',
    plagiarismRisk: 10, strengths: 'Clean code'
  });

// ─── Tests ────────────────────────────────────────────────────────────────────
beforeAll(async () => { await connect(); });
afterEach(async () => { await clearAll(); jest.clearAllMocks(); });
afterAll(async () => { await disconnect(); });

describe('POST /api/submissions', () => {
  it('requires auth', async () => {
    const problem = await makeProblem();
    const res = await request(app).post('/api/submissions').send({ problemId: problem._id, code: 'x=1', language: 'python' });
    expect(res.statusCode).toBe(401);
  });

  it('accepts correct submission and awards points', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    mockJudgePass();
    mockAI();

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: problem._id, code: 'def solve(): pass', language: 'python' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.submission.status).toBe('accepted');
    expect(res.body.data.pointsEarned).toBeGreaterThan(0);
    expect(res.body.data.alreadySolved).toBe(false);

    // User should have the problem in solvedProblems now
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.solvedProblems.map(id => id.toString())).toContain(problem._id.toString());
    expect(updatedUser.problemsSolved).toBe(1);
  });

  it('does NOT award points on re-submission of already-solved problem', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    mockJudgePass();
    mockAI();

    // First solve
    await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: problem._id, code: 'def solve(): pass', language: 'python' });

    // Second solve
    mockJudgePass();
    mockAI();
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: problem._id, code: 'def solve(): pass', language: 'python' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.alreadySolved).toBe(true);
    expect(res.body.data.pointsEarned).toBe(0);

    // problemsSolved should still be 1 (not incremented again)
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.problemsSolved).toBe(1);
  });

  it('returns wrong_answer status for failed submission', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    mockJudgeFail();

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: problem._id, code: 'def wrong(): pass', language: 'python' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.submission.status).toBe('wrong_answer');
    expect(res.body.data.pointsEarned).toBe(0);
  });

  it('returns 404 for unknown problem ID', async () => {
    const user = await makeUser();
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: fakeId, code: 'x=1', language: 'python' });

    expect(res.statusCode).toBe(404);
  });

  it('increments currentStreak on first accepted submission of the day', async () => {
    const user = await makeUser();
    const problem = await makeProblem();
    mockJudgePass();
    mockAI();

    await request(app)
      .post('/api/submissions')
      .set('Authorization', authHeader(user))
      .send({ problemId: problem._id, code: 'def solve(): pass', language: 'python' });

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.currentStreak).toBe(1);
    expect(updatedUser.longestStreak).toBe(1);
  });
});

describe('GET /api/submissions', () => {
  it('returns submission history for authenticated user', async () => {
    const user = await makeUser();
    const problem = await makeProblem();

    await Submission.create({ user: user._id, problem: problem._id, code: 'x=1', language: 'python', status: 'accepted', totalTestCases: 2, testCasesPassed: 2, pointsEarned: 100 });

    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', authHeader(user));

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('does not return another user\'s submissions', async () => {
    const userA = await makeUser();
    const userB = await makeUser({ email: 'b@test.com' });
    const problem = await makeProblem();

    await Submission.create({ user: userA._id, problem: problem._id, code: 'x=1', language: 'python', status: 'accepted', totalTestCases: 2, testCasesPassed: 2 });

    const res = await request(app)
      .get('/api/submissions')
      .set('Authorization', authHeader(userB));

    expect(res.body.data).toHaveLength(0);
  });
});
