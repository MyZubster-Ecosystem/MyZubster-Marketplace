const request = require('supertest');
const app = require('../server');
const { User } = require('../models');

describe('Auth API', () => {
  test('POST /api/users/register - successo', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        email: 'testuser@example.com',
        password: 'test123',
        name: 'Test User'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'testuser@example.com');
  });

  test('POST /api/users/login - successo (utente già registrato)', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'testuser@example.com',
        password: 'test123'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/users/login - fallimento (password errata)', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'testuser@example.com',
        password: 'wrongpassword'
      });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});