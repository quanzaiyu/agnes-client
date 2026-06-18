import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { setJwtSecret, JWT_SECRET } from '../../src/middleware/auth.js';

test('setJwtSecret changes signing key', () => {
  setJwtSecret('k1');
  const t1 = jwt.sign({ u: 1 }, 'k1');
  setJwtSecret('k2');
  assert.throws(() => jwt.verify(t1, 'k2'));
});

test('JWT_SECRET accessor returns the current secret', () => {
  setJwtSecret('accessor-test');
  assert.equal(JWT_SECRET(), 'accessor-test');
});

test('tokens signed with old secret no longer verify under new secret', () => {
  setJwtSecret('alpha');
  const t = jwt.sign({ u: 7 }, 'alpha');
  setJwtSecret('beta');
  // token signed under 'alpha' must not verify under current secret 'beta'
  assert.throws(() => jwt.verify(t, 'beta'));
  // sign + verify with current secret works
  const t2 = jwt.sign({ u: 7 }, 'beta');
  const decoded = jwt.verify(t2, 'beta');
  assert.equal(decoded.u, 7);
});
