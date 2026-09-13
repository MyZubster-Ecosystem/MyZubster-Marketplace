const test = require('node:test');
const assert = require('node:assert/strict');
const gateway = require('../services/conversionGatewayService');
const { applyMyZubsterFee, calculateFee } = require('../services/conversionFeeEngine');
const HttpConversionProviderAdapter = require('../services/providers/httpConversionProviderAdapter');
const CoinbaseAdvancedTradeCandidateAdapter = require('../services/providers/coinbaseAdvancedTradeCandidateAdapter');

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

test('fee engine calculates basis-point fees without floating-point math', () => {
  assert.equal(calculateFee('100', 100), '1');
  assert.deepEqual(applyMyZubsterFee('100', 100), {
    grossRecipientAmount: '100',
    myzubsterFee: '1',
    recipientAmount: '99',
    feeBasisPoints: 100
  });
  assert.equal(calculateFee('0.000000000000000100', 100), '0.000000000000000001');
});

test('HTTP provider adapter cannot be enabled without explicit approval', () => {
  assert.throws(
    () => new HttpConversionProviderAdapter({ baseUrl: 'https://provider.invalid', approved: false }),
    /explicitly approved/
  );
});

test('Coinbase candidate adapter refuses MYZ until an external asset mapping exists', () => {
  const adapter = new CoinbaseAdvancedTradeCandidateAdapter();
  assert.throws(
    () => adapter.productId('MYZ', 'EUR'),
    error => error.code === 'MYZ_EXTERNAL_ASSET_NOT_CONFIGURED'
  );
});

test('Coinbase sandbox probe stays explicitly non-executable', async () => {
  const adapter = new CoinbaseAdvancedTradeCandidateAdapter({
    sandbox: true,
    myzExternalAssetId: 'MYZ'
  });
  const result = await adapter.probePair({ from: 'MYZ', to: 'EUR' });
  assert.equal(result.productId, 'MYZ-EUR');
  assert.equal(result.supported, false);
  assert.equal(result.executable, false);
  assert.equal(result.reason, 'sandbox_static_responses_only');
});
