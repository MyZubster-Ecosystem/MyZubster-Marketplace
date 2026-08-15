const request = require('supertest');
const app = require('../server');
const { models } = require('../server');
const { User, Skill, Order } = models;

describe('Webhook API', () => {
  let sellerToken, buyerToken;
  let skillId, orderId;

  beforeAll(async () => {
    // 1. Registra un venditore
    const sellerRes = await request(app)
      .post('/api/users/register')
      .send({
        email: 'webhook-seller@test.com',
        password: 'test123',
        name: 'Webhook Seller'
      });
    sellerToken = sellerRes.body.token;

    // 2. Registra un acquirente
    const buyerRes = await request(app)
      .post('/api/users/register')
      .send({
        email: 'webhook-buyer@test.com',
        password: 'test123',
        name: 'Webhook Buyer'
      });
    buyerToken = buyerRes.body.token;
    const buyerId = buyerRes.body.user.id;

    // 3. Crea una skill
    const skillRes = await request(app)
      .post('/api/skills')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Webhook Test Skill',
        description: 'Skill per test webhook',
        price: 0.5,
        category: 'Testing'
      });
    skillId = skillRes.body.id;

    // 4. Crea un ordine
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        skill_id: skillId,
        buyer_id: buyerId,
        amount: 0.5
      });
    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    // Pulizia (opzionale)
    await Order.destroy({ where: {} });
    await Skill.destroy({ where: {} });
    await User.destroy({ where: { email: ['webhook-seller@test.com', 'webhook-buyer@test.com'] } });
  });

  test('POST /api/webhook/order-update - aggiorna ordine', async () => {
    const webhookRes = await request(app)
      .post('/api/webhook/order-update')
      .send({
        orderId,
        status: 'completed',
        event: 'order.completed',
        payload: { note: 'Lavoro completato' }
      });

    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.body.message).toBe('Webhook ricevuto');
    expect(webhookRes.body.order.status).toBe('completed');
  });
});
