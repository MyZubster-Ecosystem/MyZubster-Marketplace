const test = require('node:test');
const assert = require('node:assert/strict');
const gateway = require('../services/conversionGatewayService');

test('conversion gateway exposes supported assets', () => {
  assert.deepEqual(gateway.listSupportedAssets(), ['MYZ', 'EUR', 'USDC', 'XMR']);
});

test('conversion gateway validates decimal-string amounts', () => {
  assert.deepEqual(
    gateway.validateQuoteRequest({ from: 'myz', to: 'eur', amount: '1.250000000000000000' }),
    { from: 'MYZ', to: 'EUR', amount: '1.250000000000000000' }
  );

  assert.throws(
    () => gateway.validateQuoteRequest({ from: 'MYZ', to: 'EUR', amount: 1.25 }),
    /Amount must be a positive decimal string/
  );
});

test('conversion gateway fails closed without an authorized provider', async () => {
  await assert.rejects(
    gateway.createQuote({ from: 'MYZ', to: 'EUR', amount: '10' }, { userId: 'test-user' }),
    error => error.code === 'CONVERSION_PROVIDER_UNAVAILABLE'
  );
});
