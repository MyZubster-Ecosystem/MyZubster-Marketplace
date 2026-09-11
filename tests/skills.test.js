const request = require('supertest');
const app = require('../server');

let token;

beforeAll(async () => {
  // Registra un utente e ottieni il token
  const res = await request(app)
    .post('/api/users/register')
    .send({
      email: 'seller@test.com',
      password: 'test123',
      name: 'Seller User'
    });
  token = res.body.token;
  if (!token) throw new Error('Token non generato!');
});

describe('Skills API', () => {
  test('POST /api/skills - crea una competenza (seller)', async () => {
    const res = await request(app)
      .post('/api/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sviluppo Monero',
        description: 'Esperto in Monero',
        price: 0.5,
        category: 'Blockchain'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', 'Sviluppo Monero');
  });

test('GET /api/skills - restituisce competenze paginate', async () => {
  const res = await request(app).get('/api/skills?limit=1&offset=0');

  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty('data');
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.data.length).toBeLessThanOrEqual(1);

  expect(res.body.pagination).toEqual({
    total: expect.any(Number),
    limit: 1,
    offset: 0,
    pages: expect.any(Number)
  });
});

test('GET /api/skills - usa valori predefiniti di paginazione', async () => {
  const res = await request(app).get('/api/skills');

  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  expect(res.body.pagination.limit).toBe(20);
  expect(res.body.pagination.offset).toBe(0);
  expect(res.body.pagination.pages).toBe(
    Math.ceil(res.body.pagination.total / 20)
  );
});

test('GET /api/skills - rifiuta parametri di paginazione non validi', async () => {
  const invalidLimit = await request(app).get('/api/skills?limit=0');
  const invalidOffset = await request(app).get('/api/skills?offset=-1');
  const nonNumericLimit = await request(app).get(
    '/api/skills?limit=not-a-number'
  );

  expect(invalidLimit.statusCode).toBe(400);
  expect(invalidOffset.statusCode).toBe(400);
  expect(nonNumericLimit.statusCode).toBe(400);
});
});
