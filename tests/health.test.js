const request = require('supertest');
const app = require('../server');

describe('Health Check', () => {
  test('GET /api/health - restituisce 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'MyZubster-Marketplace');
  });
});
