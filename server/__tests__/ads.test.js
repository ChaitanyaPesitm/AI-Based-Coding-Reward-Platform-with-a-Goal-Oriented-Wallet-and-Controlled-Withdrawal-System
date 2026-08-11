process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const { connect, disconnect, clearAll } = require('./helpers/db');

const User = require('../models/User');
const Goal = require('../models/Goal');
const Ad = require('../models/Ad');
const AdView = require('../models/AdView');
const Transaction = require('../models/Transaction');

const adsRouter = require('../routes/ads');
const adminRouter = require('../routes/admin');

const app = express();
app.use(express.json());
app.use('/api/ads', adsRouter);
app.use('/api/admin', adminRouter);

const makeUser = (overrides = {}) =>
  User.create({ name: 'AdTester', email: `ad+${Date.now()}@test.com`, password: 'pass123', ...overrides });

const makeAd = (overrides = {}) =>
  Ad.create({
    sponsor: 'TestCo',
    title: 'Test Ad',
    description: 'An ad for testing',
    url: 'https://example.com',
    cta: 'Visit',
    category: 'laptop',
    isActive: true,
    rewardPoints: 10,
    rewardCooldownHours: 1,
    ...overrides
  });

const makeGoal = (userId, overrides = {}) =>
  Goal.create({ user: userId, title: 'Buy a laptop', category: 'laptop', targetAmount: 10000, currentPoints: 100, status: 'active', ...overrides });

const authHeader = (user) => `Bearer ${user.generateToken()}`;

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearAll(); });
afterAll(async () => { await disconnect(); });

describe('GET /api/ads', () => {
  it('returns only active ads for the requested category', async () => {
    const user = await makeUser();
    await makeAd({ title: 'Laptop Ad', category: 'laptop' });
    await makeAd({ title: 'Course Ad', category: 'course' });
    await makeAd({ title: 'Inactive', category: 'laptop', isActive: false });

    const res = await request(app).get('/api/ads?category=laptop').set('Authorization', authHeader(user));
    expect(res.statusCode).toBe(200);
    const titles = res.body.data.map(a => a.title);
    expect(titles).toContain('Laptop Ad');
    expect(titles).not.toContain('Course Ad');
    expect(titles).not.toContain('Inactive');
    // counters must not leak to clients
    expect(res.body.data[0].impressions).toBeUndefined();
  });
});

describe('Ad tracking', () => {
  it('increments impressions and clicks', async () => {
    const user = await makeUser();
    const ad = await makeAd();

    await request(app).post(`/api/ads/${ad._id}/impression`).set('Authorization', authHeader(user)).expect(200);
    await request(app).post(`/api/ads/${ad._id}/impression`).set('Authorization', authHeader(user)).expect(200);
    const clickRes = await request(app).post(`/api/ads/${ad._id}/click`).set('Authorization', authHeader(user)).expect(200);

    const updated = await Ad.findById(ad._id);
    expect(updated.impressions).toBe(2);
    expect(updated.clicks).toBe(1);
    expect(clickRes.body.data.url).toBe('https://example.com');

    const views = await AdView.countDocuments({ ad: ad._id });
    expect(views).toBe(3); // 2 impressions + 1 click
  });
});

describe('Rewarded ad flow', () => {
  it('requires an active goal to start a rewarded view', async () => {
    const user = await makeUser();
    const ad = await makeAd();

    const res = await request(app)
      .post(`/api/ads/${ad._id}/view-start`)
      .set('Authorization', authHeader(user))
      .expect(400);
    expect(res.body.message).toContain('active goal');
  });

  it('awards points only after the minimum watch time, with ledger entry', async () => {
    const user = await makeUser();
    const ad = await makeAd();
    await makeGoal(user._id);

    const start = await request(app)
      .post(`/api/ads/${ad._id}/view-start`)
      .set('Authorization', authHeader(user))
      .expect(200);
    const { viewId, requiredSeconds } = start.body.data;
    expect(requiredSeconds).toBeGreaterThan(0);

    // Claim too early → rejected
    await request(app)
      .post(`/api/ads/${ad._id}/reward`)
      .send({ viewId })
      .set('Authorization', authHeader(user))
      .expect(400);

    // Fast-forward the watch time
    await AdView.findByIdAndUpdate(viewId, { startedAt: new Date(Date.now() - 20000) });

    const reward = await request(app)
      .post(`/api/ads/${ad._id}/reward`)
      .send({ viewId })
      .set('Authorization', authHeader(user))
      .expect(200);
    expect(reward.body.data.points).toBe(10);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.totalPointsEarned).toBe(10);

    const tx = await Transaction.findOne({ user: user._id, source: 'ad_reward' });
    expect(tx.amount).toBe(10);

    const updatedAd = await Ad.findById(ad._id);
    expect(updatedAd.rewardClaims).toBe(1);
  });

  it('blocks a second reward for the same ad within cooldown', async () => {
    const user = await makeUser();
    const ad = await makeAd({ rewardCooldownHours: 24 });
    await makeGoal(user._id);

    const start = await request(app)
      .post(`/api/ads/${ad._id}/view-start`)
      .set('Authorization', authHeader(user))
      .expect(200);
    await AdView.findByIdAndUpdate(start.body.data.viewId, { startedAt: new Date(Date.now() - 20000) });
    await request(app)
      .post(`/api/ads/${ad._id}/reward`)
      .send({ viewId: start.body.data.viewId })
      .set('Authorization', authHeader(user))
      .expect(200);

    // New view within cooldown window
    const res = await request(app)
      .post(`/api/ads/${ad._id}/view-start`)
      .set('Authorization', authHeader(user))
      .expect(429);
    expect(res.body.message).toContain('cooldown');
  });

  it('rejects claiming a reward without a started view', async () => {
    const user = await makeUser();
    const ad = await makeAd();
    await makeGoal(user._id);

    const res = await request(app)
      .post(`/api/ads/${ad._id}/reward`)
      .send({ viewId: '000000000000000000000000' })
      .set('Authorization', authHeader(user));
    expect(res.statusCode).toBe(404);
  });
});

describe('Admin ad management', () => {
  const adminUser = () => makeUser({ email: `admin+${Date.now()}@test.com`, isAdmin: true });

  it('requires admin', async () => {
    const user = await makeUser();
    await request(app).get('/api/admin/ads').set('Authorization', authHeader(user)).expect(403);
  });

  it('lists ads with CTR', async () => {
    const admin = await adminUser();
    const ad = await makeAd();
    await Ad.findByIdAndUpdate(ad._id, { impressions: 100, clicks: 10 });

    const res = await request(app).get('/api/admin/ads').set('Authorization', authHeader(admin)).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].ctr).toBe(10);
  });

  it('creates, toggles and deletes an ad', async () => {
    const admin = await adminUser();

    const create = await request(app)
      .post('/api/admin/ads')
      .set('Authorization', authHeader(admin))
      .send({ sponsor: 'NewCo', title: 'New Ad', url: 'https://new.example.com', category: 'gadget', rewardPoints: 20 })
      .expect(201);
    const adId = create.body.data._id;

    await request(app)
      .put(`/api/admin/ads/${adId}`)
      .set('Authorization', authHeader(admin))
      .send({ isActive: false, rewardPoints: 0 })
      .expect(200);

    let ad = await Ad.findById(adId);
    expect(ad.isActive).toBe(false);
    expect(ad.rewardPoints).toBe(0);

    await request(app).delete(`/api/admin/ads/${adId}`).set('Authorization', authHeader(admin)).expect(200);
    ad = await Ad.findById(adId);
    expect(ad).toBeNull();
  });
});
