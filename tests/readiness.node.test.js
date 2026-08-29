process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const jwt = require('jsonwebtoken');

const app = require('../server');
const { setDatabaseReadyForTests } = require('../middleware/databaseReady');
const batchPaymentService = require('../services/batchPaymentService');
const { BatchPaymentService } = batchPaymentService;
const cryptoPaymentService = require('../services/cryptoPaymentService');
const subscriptionService = require('../services/subscriptionService');
const { SubscriptionService } = subscriptionService;

let server;
let baseUrl;
let token;
let secondToken;
let batchStore;
let subscriptionStore;
let batchModel;
let subscriptionModel;

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === 'payments.99' && value?.$exists === false) return document.payments?.[99] === undefined;
    return document[key] === value;
  });
}

function memoryBatchModel(store) {
  return {
    async create(data) {
      const document = structuredClone({ ...data, createdAt: new Date().toISOString() });
      store.push(document);
      return structuredClone(document);
    },
    async findOne(filter) {
      const document = store.find(item => matches(item, filter));
      return document ? structuredClone(document) : null;
    },
    async findOneAndUpdate(filter, update) {
      const document = store.find(item => matches(item, filter));
      if (!document) return null;
      document.payments.push(structuredClone(update.$push.payments));
      return structuredClone(document);
    },
    async find(filter) {
      return store.filter(item => matches(item, filter)).map(item => structuredClone(item));
    }
  };
}

function memorySubscriptionModel(store) {
  return {
    async create(data) {
      const document = structuredClone({ ...data, createdAt: new Date().toISOString() });
      store.push(document);
      return structuredClone(document);
    },
    async find(filter) {
      return store.filter(item => matches(item, filter)).map(item => structuredClone(item));
    }
  };
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  token = jwt.sign({ id: 'test-user', role: 'cittadino' }, 'test-only-jwt-secret');
  secondToken = jwt.sign({ id: 'second-user', role: 'cittadino' }, 'test-only-jwt-secret');
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

beforeEach(() => {
  setDatabaseReadyForTests(false);
  batchStore = [];
  subscriptionStore = [];
  batchModel = memoryBatchModel(batchStore);
  subscriptionModel = memorySubscriptionModel(subscriptionStore);
  batchPaymentService.setModelForTests(batchModel);
  subscriptionService.setModelForTests(subscriptionModel);
});

after(async () => {
  setDatabaseReadyForTests(undefined);
  batchPaymentService.setModelForTests();
  subscriptionService.setModelForTests();
  await new Promise(resolve => server.close(resolve));
});

test('liveness remains available and readiness fails closed without MongoDB', async () => {
  const health = await api('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(health.body.database, 'unavailable');

  const readiness = await api('/api/ready');
  assert.equal(readiness.status, 503);
  assert.equal(readiness.body.status, 'not_ready');
});

test('auth fails immediately with 503 when MongoDB is unavailable', async () => {
  const startedAt = Date.now();
  const response = await api('/api/auth/login', {
    method: 'POST',
    body: { username: 'smoke-test', password: 'invalid-password' }
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'DATABASE_UNAVAILABLE');
  assert.ok(Date.now() - startedAt < 1000);
});

test('payment endpoints require authentication before accepting data', async () => {
  const response = await api('/api/crypto-payment/create', {
    method: 'POST',
    body: { amount: 1, currency: 'XMR', recipient: 'test-recipient' }
  });

  assert.equal(response.status, 401);
});

test('authenticated payment endpoints fail closed while MongoDB is unavailable', async () => {
  const response = await api('/api/crypto-payment/create', {
    method: 'POST',
    token,
    body: { amount: 1, currency: 'XMR', recipient: 'test-recipient' }
  });

  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'DATABASE_UNAVAILABLE');
});

test('invalid crypto payments and conversions are rejected', async () => {
  setDatabaseReadyForTests(true);

  const payment = await api('/api/crypto-payment/create', {
    method: 'POST',
    token,
    body: {}
  });
  assert.equal(payment.status, 400);

  const conversion = await api('/api/crypto-payment/convert?amount=abc&from=BTC&to=XMR', { token });
  assert.equal(conversion.status, 400);
});

test('crypto service builds an unverified persisted-intent shape without a synthetic txid', () => {
  const intent = cryptoPaymentService.buildPaymentIntent(
    { amount: '0.5', currency: 'XMR', recipient: 'test-recipient' },
    'test-user'
  );

  assert.equal(intent.status, 'awaiting_external_payment');
  assert.equal(intent.verificationStatus, 'unverified');
  assert.equal(intent.amount, '0.5');
  assert.equal('txId' in intent, false);
});

test('batch data is persistent, exact and isolated by authenticated user', async () => {
  setDatabaseReadyForTests(true);

  const created = await api('/api/batch-payment/create', {
    method: 'POST',
    token,
    body: {
      name: 'Test batch',
      payments: [
        { amount: '0.1', currency: 'XMR', recipient: 'test-recipient' },
        { amount: '0.200000000000000001', currency: 'XMR', recipient: 'second-recipient' }
      ]
    }
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.status, 'draft');
  assert.equal(created.body.data.totalAmount, '0.300000000000000001');

  const unauthorizedMutation = await api('/api/batch-payment/add-payment', {
    method: 'POST',
    token: secondToken,
    body: {
      batchId: created.body.data.id,
      amount: '1',
      currency: 'XMR',
      recipient: 'unauthorized-recipient'
    }
  });
  assert.equal(unauthorizedMutation.status, 404);
  assert.equal(unauthorizedMutation.body.code, 'BATCH_NOT_FOUND');

  const ownerStats = await api('/api/batch-payment/stats', { token });
  const otherStats = await api('/api/batch-payment/stats', { token: secondToken });
  assert.equal(ownerStats.body.data.totalBatches, 1);
  assert.equal(ownerStats.body.data.totalPayments, 2);
  assert.equal(otherStats.body.data.totalBatches, 0);

  const restartedService = new BatchPaymentService(batchModel);
  assert.equal((await restartedService.getStats('test-user')).totalBatches, 1);

  const execution = await api(`/api/batch-payment/execute/${created.body.data.id}`, {
    method: 'POST',
    token
  });
  assert.equal(execution.status, 503);
  assert.equal(execution.body.code, 'SETTLEMENT_PROVIDER_NOT_CONFIGURED');
});

test('financial endpoints reject imprecise JSON number amounts', async () => {
  setDatabaseReadyForTests(true);

  const batch = await api('/api/batch-payment/create', {
    method: 'POST',
    token,
    body: { payments: [{ amount: 0.1, currency: 'XMR', recipient: 'test-recipient' }] }
  });
  assert.equal(batch.status, 400);

  const subscription = await api('/api/subscription/create', {
    method: 'POST',
    token,
    body: {
      amount: 0.1,
      currency: 'XMR',
      subscriber: 'test-subscriber',
      interval: 'monthly'
    }
  });
  assert.equal(subscription.status, 400);
});

test('subscriptions persist exact amounts and expose only owner statistics', async () => {
  setDatabaseReadyForTests(true);

  const created = await api('/api/subscription/create', {
    method: 'POST',
    token,
    body: {
      amount: '0.123456789012345678',
      currency: 'XMR',
      subscriber: 'test-subscriber',
      interval: 'monthly'
    }
  });
  assert.equal(created.status, 202);
  assert.equal(created.body.data.amount, '0.123456789012345678');
  assert.equal(created.body.data.verificationStatus, 'unverified');

  const ownerStats = await api('/api/subscription/stats', { token });
  const otherStats = await api('/api/subscription/stats', { token: secondToken });
  assert.equal(ownerStats.body.data.total, 1);
  assert.equal(otherStats.body.data.total, 0);

  const restartedService = new SubscriptionService(subscriptionModel);
  assert.equal((await restartedService.getStats('test-user')).total, 1);
});

test('payout and repeater settlement remain disabled without an independent provider', async () => {
  setDatabaseReadyForTests(true);

  const payout = await api('/api/payout/withdraw', {
    method: 'POST',
    token,
    body: { amount: 1, currency: 'XMR', address: 'test-address' }
  });
  assert.equal(payout.status, 503);
  assert.equal(payout.body.code, 'PAYOUT_PROVIDER_NOT_CONFIGURED');

  const repeater = await api('/api/repeater-payment/process', {
    method: 'POST',
    token,
    body: { sourceId: 'a', targetId: 'b', messageSize: 1, hops: 1 }
  });
  assert.equal(repeater.status, 503);
  assert.equal(repeater.body.code, 'SETTLEMENT_PROVIDER_NOT_CONFIGURED');
  assert.equal('transactionId' in repeater.body, false);
});
