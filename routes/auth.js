const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');
const { isDatabaseReady, requireDatabaseReady } = require('../middleware/databaseReady');

router.use(requireDatabaseReady);

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function validUsername(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]{3,50}$/.test(value);
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    verified: user.verified,
    reputation: user.reputation
  };
}

router.post('/register', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!validUsername(username) || !validEmail(email) || !validPassword(password)) {
      return res.status(400).json({
        error: 'Invalid registration data',
        code: 'INVALID_REGISTRATION_DATA'
      });
    }
    const user = new User({ username, email, password });
    await user.save();
    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '24h' });
    res.json({ success: true, data: { user: publicUser(user), token } });
  } catch (error) {
    if (!isDatabaseReady()) {
      return res.status(503).json({ error: 'Database temporarily unavailable', code: 'DATABASE_UNAVAILABLE' });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists', code: 'USER_ALREADY_EXISTS' });
    }
    console.error('Registration failed:', error.message);
    return res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_FAILED' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = req.body?.password;
    if (!validUsername(username) || !validPassword(password)) {
      return res.status(400).json({ error: 'Invalid credentials format', code: 'INVALID_CREDENTIALS_FORMAT' });
    }
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, getJwtSecret(), { expiresIn: '24h' });
    res.json({ success: true, data: { user: publicUser(user), token } });
  } catch (error) {
    if (!isDatabaseReady()) {
      return res.status(503).json({ error: 'Database temporarily unavailable', code: 'DATABASE_UNAVAILABLE' });
    }
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Login failed', code: 'LOGIN_FAILED' });
  }
});

module.exports = router;
