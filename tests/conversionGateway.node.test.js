const test = require('node:test');
const assert = require('node:assert/strict');
const gateway = require('../services/conversionGatewayService');
const { applyMyZubsterFee, calculateFee } = require('../services/conversionFeeEngine');
const HttpConversionProviderAdapter = require('../services/providers/httpConversionProviderAdapter');
const CoinbaseAdvancedTradeCandidateAdapter = require('../services/providers/coinbaseAdvancedTradeCandidateAdapter');
const MyzRedemptionProviderContract = require('../services/providers/myzRedemptionProviderContract');
const MyzInternalLedgerAdapter = require('../services/myzInternalLedgerAdapter');
const { MyzAssetIdentityService } = require('../services/myzAssetIdentityService');
const { MyzRedemptionReconciliationService } = require('../services/myzRedemptionReconciliationService');

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

test('MYZ defaults to internal credit and cannot be treated as externally tradable', () => {
  const identity = new MyzAssetIdentityService({});
  const status = identity.getStatus();
  assert.equal(status.mode, 'internal_credit');
  assert.equal(status.externallyTradable, false);
  assert.equal(status.ready, true);
  assert.equal(status.legalAuthorizationImplied, false);
  assert.throws(
    () => identity.assertReadyForExternalUse(),
    error => error.code === 'MYZ_INTERNAL_CREDIT_ONLY'
  );
});

test('redemption bridge requires an explicit rail identifier', () => {
  const incomplete = new MyzAssetIdentityService({ MYZ_ASSET_MODE: 'redemption_bridge' });
  assert.equal(incomplete.getStatus().ready, false);
  assert.deepEqual(incomplete.getStatus().missingRequirements, ['MYZ_REDEMPTION_RAIL']);

  const complete = new MyzAssetIdentityService({
    MYZ_ASSET_MODE: 'redemption_bridge',
    MYZ_REDEMPTION_RAIL: 'reviewed-provider-contract-v1'
  });
  assert.equal(complete.getStatus().redemptionConfigured, true);
  assert.equal(complete.assertReadyForExternalUse().mode, 'redemption_bridge');
});

test('external MYZ asset mode requires network and asset identifier', () => {
  const incomplete = new MyzAssetIdentityService({
    MYZ_ASSET_MODE: 'external_asset',
    CONVERSION_MYZ_EXTERNAL_ASSET_ID: 'MYZ'
  });
  assert.equal(incomplete.getStatus().ready, false);
  assert.deepEqual(incomplete.getStatus().missingRequirements, ['MYZ_EXTERNAL_NETWORK']);

  const complete = new MyzAssetIdentityService({
    MYZ_ASSET_MODE: 'external_asset',
    CONVERSION_MYZ_EXTERNAL_ASSET_ID: 'asset-123',
    MYZ_EXTERNAL_NETWORK: 'example-network'
  });
  const status = complete.assertReadyForExternalUse();
  assert.equal(status.externallyTradable, true);
  assert.equal(status.externalAssetId, 'asset-123');
  assert.equal(status.network, 'example-network');
});

test('redemption provider contract requires explicit review', () => {
  assert.throws(
    () => new MyzRedemptionProviderContract({ name: 'candidate-redemption-provider', reviewed: false }),
    error => error.code === 'MYZ_REDEMPTION_PROVIDER_NOT_REVIEWED'
  );
});

test('redemption provider contract validates quote and settlement evidence', () => {
  const provider = new MyzRedemptionProviderContract({ name: 'reviewed-provider', reviewed: true });
  const quote = provider.validateQuote({
    quoteId: 'rq-1',
    fromAmount: '100',
    toAsset: 'EUR',
    grossRecipientAmount: '10',
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    priceMethodology: 'documented-reference-v1'
  });
  assert.equal(quote.fromAsset, 'MYZ');
  assert.equal(quote.executable, false);
  assert.equal(quote.provider, 'reviewed-provider');

  const evidence = provider.validateSettlementEvidence({
    providerTransactionId: 'tx-1',
    settledAt: new Date().toISOString(),
    toAsset: 'EUR',
    recipientAmount: '9.9',
    evidence: { reference: 'provider-report-1' }
  });
  assert.equal(evidence.providerTransactionId, 'tx-1');
  assert.equal(evidence.toAsset, 'EUR');
});

test('canonical MYZ ledger adapter requires explicit review', () => {
  assert.throws(
    () => new MyzInternalLedgerAdapter({ baseUrl: 'https://ledger.invalid', reviewed: false }),
    error => error.code === 'MYZ_LEDGER_ADAPTER_NOT_REVIEWED'
  );
});

test('canonical MYZ ledger adapter uses deterministic marketplace account mapping', () => {
  const adapter = new MyzInternalLedgerAdapter({
    baseUrl: 'https://ledger.invalid',
    reviewed: true,
    accountPrefix: 'marketplace:user:'
  });
  assert.equal(adapter.accountIdForUser('abc-123'), 'marketplace:user:abc-123');
});

test('redemption reconciliation state machine allows only ordered transitions', () => {
  const service = new MyzRedemptionReconciliationService({ skipEnvConfiguration: true });
  assert.equal(service.assertTransition('quote_accepted', 'credit_reserved'), true);
  assert.equal(service.assertTransition('credit_reserved', 'settlement_requested'), true);
  assert.equal(service.assertTransition('settlement_requested', 'settled'), true);
  assert.equal(service.assertTransition('settled', 'reconciled'), true);

  assert.throws(
    () => service.assertTransition('quote_accepted', 'settled'),
    error => error.code === 'INVALID_MYZ_REDEMPTION_TRANSITION'
  );
  assert.throws(
    () => service.assertTransition('reconciled', 'rolled_back'),
    error => error.code === 'INVALID_MYZ_REDEMPTION_TRANSITION'
  );
});

test('redemption reconciliation refuses incomplete provider adapters', () => {
  const service = new MyzRedemptionReconciliationService({ skipEnvConfiguration: true });
  assert.throws(
    () => service.registerProvider('broken-provider', { getRedemptionQuote() {} }),
    /missing methods/
  );
});

test('redemption reconciliation refuses incomplete ledger adapters', () => {
  const service = new MyzRedemptionReconciliationService({ skipEnvConfiguration: true });
  assert.throws(
    () => service.registerLedgerAdapter({ reserveInternalCredit() {} }),
    /ledger adapter is missing methods/
  );
});
