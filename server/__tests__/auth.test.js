process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { connect, disconnect, clearAll } = require('./helpers/db');

const User = require('../models/User');
const authRouter = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearAll(); });
afterAll(async () => { await disconnect(); });

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a JWT token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123'
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@test.com');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('rejects duplicate email', async () => {
    await User.create({ name: 'Bob', email: 'bob@test.com', password: 'password123' });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob2',
      email: 'bob@test.com',
      password: 'differentpass'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'NoEmail' });
    expect(res.statusCode).toBe(500); // Mongoose validation error
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await User.create({ name: 'Carol', email: 'carol@test.com', password: 'secret123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'carol@test.com',
      password: 'secret123'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'carol@test.com',
      password: 'wrongpassword'
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@test.com',
      password: 'whatever'
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing body fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user profile with valid token', async () => {
    const user = await User.create({ name: 'Dave', email: 'dave@test.com', password: 'pass123' });
    const token = user.generateToken();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('dave@test.com');
  });

  it('rejects requests without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.statusCode).toBe(401);
  });
});
