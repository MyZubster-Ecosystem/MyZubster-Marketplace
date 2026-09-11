process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { addDecimalAmounts, normalizePaymentAmount } = require('../middleware/paymentValidation');
const { BatchPaymentService } = require('../services/batchPaymentService');
const { SubscriptionService } = require('../services/subscriptionService');

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

test('decimal amounts remain exact and imprecise JSON numbers are rejected', () => {
  assert.equal(addDecimalAmounts(['0.1', '0.200000000000000001']), '0.300000000000000001');
  assert.equal(normalizePaymentAmount(1), '1');
  assert.equal(normalizePaymentAmount(0.1), null);
  assert.equal(normalizePaymentAmount('1e3'), null);
});

test('batch records survive service recreation and remain isolated by owner', async () => {
  const store = [];
  const model = memoryBatchModel(store);
  const service = new BatchPaymentService(model);
  const batch = await service.createBatch({
    name: 'Persistent batch',
    payments: [
      { amount: '0.1', currency: 'XMR', recipient: 'first-recipient' },
      { amount: '0.200000000000000001', currency: 'XMR', recipient: 'second-recipient' }
    ]
  }, 'owner-a');

  assert.equal(batch.totalAmount, '0.300000000000000001');
  assert.equal((await service.getStats('owner-b')).totalBatches, 0);

  const restartedService = new BatchPaymentService(model);
  assert.equal((await restartedService.getStats('owner-a')).totalBatches, 1);

  await assert.rejects(
    restartedService.addPaymentToBatch(batch.id, {
      amount: '1',
      currency: 'XMR',
      recipient: 'unauthorized-recipient'
    }, 'owner-b'),
    error => error.code === 'BATCH_NOT_FOUND'
  );
});

test('subscription records survive service recreation and owner statistics are isolated', async () => {
  const store = [];
  const model = memorySubscriptionModel(store);
  const service = new SubscriptionService(model);
  const subscription = await service.createSubscription({
    name: 'Persistent subscription',
    amount: '0.123456789012345678',
    currency: 'XMR',
    interval: 'monthly',
    subscriber: 'test-subscriber'
  }, 'owner-a');

  assert.equal(subscription.amount, '0.123456789012345678');
  assert.equal((await service.getStats('owner-b')).total, 0);

  const restartedService = new SubscriptionService(model);
  assert.equal((await restartedService.getStats('owner-a')).total, 1);
});
