'use strict';

const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin, JWT_SECRET } = require('../../middleware/auth');

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function makeReq(token) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, options);
}

// ── requireAuth ───────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with "Bearer "', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a syntactically invalid token', () => {
    const req = makeReq('this.is.not.a.real.jwt');
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = signToken({ id: 1, role: 'Admin' }, { expiresIn: -1 });
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: 1, role: 'Admin' }, 'wrong-secret');
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches user for a valid token', () => {
    const payload = { id: 1, username: 'admin', role: 'Admin' };
    const token = signToken(payload);
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject(payload);
  });

  it('attaches correct user fields from token payload', () => {
    const payload = { id: 5, username: 'manager', role: 'Management' };
    const token = signToken(payload);
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(req.user.id).toBe(5);
    expect(req.user.username).toBe('manager');
    expect(req.user.role).toBe('Management');
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('returns 401 when no Authorization header is present', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user role is "Management"', () => {
    const token = signToken({ id: 2, role: 'Management' });
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin only' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for any non-Admin role', () => {
    const token = signToken({ id: 3, role: 'Viewer' });
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when user role is "Admin"', () => {
    const token = signToken({ id: 1, role: 'Admin' });
    const req = makeReq(token);
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
