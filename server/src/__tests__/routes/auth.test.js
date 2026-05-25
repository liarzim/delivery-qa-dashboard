'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Mock the DB before requiring any route modules
jest.mock('../../db/init', () => ({ getDb: jest.fn() }));
const { getDb } = require('../../db/init');

const authRouter = require('../../routes/auth');
const { JWT_SECRET } = require('../../middleware/auth');

// Build a minimal express app mounting the auth router
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

// Low bcrypt rounds so tests run fast
const TEST_HASH = bcrypt.hashSync('password123', 1);

function adminToken() {
  return jwt.sign({ id: 1, username: 'admin', role: 'Admin' }, JWT_SECRET);
}

function mgmtToken() {
  return jwt.sign({ id: 2, username: 'manager', role: 'Management' }, JWT_SECRET);
}

function mockDb(overrides = {}) {
  const db = {
    prepare: jest.fn(),
    close: jest.fn(),
  };
  if (overrides.prepare) db.prepare.mockImplementation(overrides.prepare);
  getDb.mockReturnValue(db);
  return db;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown username', async () => {
    mockDb({
      prepare: () => ({ get: () => null }),
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 for wrong password', async () => {
    mockDb({
      prepare: () => ({
        get: () => ({ id: 1, username: 'admin', password_hash: TEST_HASH, role: 'Admin' }),
      }),
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token and user for correct credentials', async () => {
    mockDb({
      prepare: () => ({
        get: () => ({ id: 1, username: 'admin', password_hash: TEST_HASH, role: 'Admin' }),
      }),
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ id: 1, username: 'admin', role: 'Admin' });
  });

  it('returned token is a valid JWT', async () => {
    mockDb({
      prepare: () => ({
        get: () => ({ id: 1, username: 'admin', password_hash: TEST_HASH, role: 'Admin' }),
      }),
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' });
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.username).toBe('admin');
    expect(decoded.role).toBe('Admin');
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the decoded user payload for a valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'Admin' });
  });
});

// ── GET /api/auth/users ───────────────────────────────────────────────────────

describe('GET /api/auth/users', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-Admin users', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${mgmtToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns user list for Admin', async () => {
    const users = [{ id: 1, username: 'admin', role: 'Admin', created_at: '2024-01-01' }];
    mockDb({ prepare: () => ({ all: () => users }) });
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(users);
  });
});

// ── POST /api/auth/users ──────────────────────────────────────────────────────

describe('POST /api/auth/users', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/auth/users').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-Admin users', async () => {
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${mgmtToken()}`)
      .send({ username: 'u', password: 'p', role: 'Management' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'u', password: 'p' }); // missing role
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'u', password: 'p', role: 'SuperAdmin' });
    expect(res.status).toBe(400);
  });

  it('creates a new user and returns 200', async () => {
    mockDb({ prepare: () => ({ run: () => ({ lastInsertRowid: 5 }) }) });
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'newuser', password: 'secret', role: 'Management' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, username: 'newuser', role: 'Management' });
  });

  it('returns 409 for duplicate username', async () => {
    mockDb({
      prepare: () => ({
        run: () => { throw new Error('UNIQUE constraint failed'); },
      }),
    });
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'admin', password: 'x', role: 'Admin' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// ── DELETE /api/auth/users/:id ────────────────────────────────────────────────

describe('DELETE /api/auth/users/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/api/auth/users/2');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-Admin users', async () => {
    const res = await request(app)
      .delete('/api/auth/users/1')
      .set('Authorization', `Bearer ${mgmtToken()}`);
    expect(res.status).toBe(403);
  });

  it('deletes the user and returns success for Admin', async () => {
    mockDb({ prepare: () => ({ run: jest.fn() }) });
    const res = await request(app)
      .delete('/api/auth/users/2')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
