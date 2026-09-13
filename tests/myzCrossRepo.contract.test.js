'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

const MyzInternalLedgerAdapter = require('../services/myzInternalLedgerAdapter');
const MyzRedemptionProviderContract = require('../services/providers/myzRedemptionProviderContract');

function writeLedger(file, entries) {
  fs.writeFileSync(file, `${JSON.stringify({
    schema: 'myzubster-myz-ledger/v1',
    asset: 'MYZ',
    asset_type: 'internal-reward-accounting-unit',
    on_chain: false,
    entries,
    integrity: { canonicalization: 'json-key-sort-v1', sha256: null, signature: null },
    notes: ['cross-repo contract test fixture']
  }, null, 2)}\n`);
}

function initialCredit() {
  return {
    entry_id: 'MYZ-LEDGER-CONTRACT-CREDIT-1',
    timestamp: '2026-09-13T00:00:00.000Z',
    account_id: 'marketplace:user:alice',
    amount_myz: '100',
    entry_type: 'BOUNTY_REWARD',
    reference: { program: 'contract-test' },
    status: 'RECORDED',
    evidence: [],
    reverses_entry_id: null,
    note: 'Contract-test opening balance'
  };
}

class MockReviewedSettlementProvider extends MyzRedemptionProviderContract {
  constructor() {
    super({ name: 'mock-reviewed-settlement-provider', reviewed: true });
    this.executionCount = 0;
  }

  async getRedemptionQuote({ fromAmount, toAsset }) {
    return {
      quoteId: 'cross-repo-quote-1',
      fromAmount,
      toAsset,
      grossRecipientAmount: '2.5',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      priceMethodology: 'contract-test-fixed-rate-only'
    };
  }

  async executeExternalSettlement({ toAsset, expectedRecipientAmount }) {
    this.executionCount += 1;
    return {
      providerTransactionId: 'mock-external-tx-1',
      settledAt: new Date().toISOString(),
      toAsset,
      recipientAmount: expectedRecipientAmount,
      evidence: {
        source: 'mock-provider',
        reference: 'mock-external-tx-1',
        testOnly: true
      }
    };
  }

  async reconcileSettlement({ expectedRecipientAmount, actualRecipientAmount, toAsset }) {
    return {
      matched: expectedRecipientAmount === actualRecipientAmount && toAsset === 'EUR',
      commitInternalDebit: true,
      note: 'Mock external settlement matched contract test expectations'
    };
  }
}

test('cross-repo vertical slice: canonical balance -> reserve -> mock settlement -> canonical debit -> final balance', async (t) => {
  const coreDir = process.env.MYZ_CORE_DIR;
  if (!coreDir) {
    t.skip('MYZ_CORE_DIR is not configured; cross-repo contract test runs in dedicated CI workflow');
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'myz-cross-repo-'));
  const ledgerPath = path.join(tempDir, 'ledger.json');
  writeLedger(ledgerPath, [initialCredit()]);

  const previousEnv = {
    MYZ_LEDGER_PATH: process.env.MYZ_LEDGER_PATH,
    MYZ_LEDGER_SERVICE_TOKEN: process.env.MYZ_LEDGER_SERVICE_TOKEN,
    MYZ_LEDGER_ALLOWED_ACCOUNT_PREFIXES: process.env.MYZ_LEDGER_ALLOWED_ACCOUNT_PREFIXES,
    MYZ_ASSET_MODE: process.env.MYZ_ASSET_MODE,
    MYZ_REDEMPTION_RAIL: process.env.MYZ_REDEMPTION_RAIL
  };

  process.env.MYZ_LEDGER_PATH = ledgerPath;
  process.env.MYZ_LEDGER_SERVICE_TOKEN = 'cross-repo-service-token';
  process.env.MYZ_LEDGER_ALLOWED_ACCOUNT_PREFIXES = 'marketplace:user:';
  process.env.MYZ_ASSET_MODE = 'redemption_bridge';
  process.env.MYZ_REDEMPTION_RAIL = 'cross-repo-contract-test-v1';

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myzubster_cross_repo_contract';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  const coreRoutePath = path.join(coreDir, 'src', 'routes', 'myzLedgerApiRoutes.js');
  assert.equal(fs.existsSync(coreRoutePath), true, `Core MYZ route not found at ${coreRoutePath}`);

  // Require after setting MYZ_LEDGER_PATH so the core singleton binds to this isolated fixture.
  delete require.cache[require.resolve(coreRoutePath)];
  const coreMyzRoutes = require(coreRoutePath);

  const coreApp = express();
  coreApp.use(express.json());
  coreApp.use('/api/v1/myz', coreMyzRoutes);

  const server = await new Promise((resolve) => {
    const instance = coreApp.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  try {
    const ledgerAdapter = new MyzInternalLedgerAdapter({
      baseUrl,
      apiKey: 'cross-repo-service-token',
      reviewed: true,
      accountPrefix: 'marketplace:user:',
      timeoutMs: 5000
    });

    // Load the reconciliation service only after MYZ identity env is configured.
    const reconciliationModulePath = require.resolve('../services/myzRedemptionReconciliationService');
    delete require.cache[reconciliationModulePath];
    const { MyzRedemptionReconciliationService } = require('../services/myzRedemptionReconciliationService');
    const reconciliation = new MyzRedemptionReconciliationService({
      ledgerAdapter,
      skipEnvConfiguration: true
    });
    const provider = new MockReviewedSettlementProvider();
    reconciliation.registerProvider(provider.name, provider);

    const initial = await ledgerAdapter.getCanonicalBalance('marketplace:user:alice');
    assert.equal(initial.balanceMyz, '100');
    assert.match(initial.revision, /^[a-f0-9]{64}$/);

    const result = await reconciliation.start({
      provider: provider.name,
      fromAmount: '25',
      toAsset: 'EUR'
    }, { userId: 'alice' });

    assert.equal(result.state, 'reconciled');
    assert.equal(result.providerTransactionId, 'mock-external-tx-1');
    assert.equal(provider.executionCount, 1);

    const reservation = await ledgerAdapter.getReservation(result.reservationId, 'alice');
    assert.equal(reservation.state, 'committed');
    assert.ok(reservation.canonicalDebitEntryId);

    const finalBalance = await ledgerAdapter.getCanonicalBalance('marketplace:user:alice');
    assert.equal(finalBalance.balanceMyz, '75');
    assert.notEqual(finalBalance.revision, initial.revision);

    const persistedLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const debits = persistedLedger.entries.filter(entry => entry.entry_type === 'ADJUSTMENT_DEBIT');
    assert.equal(debits.length, 1);
    assert.equal(debits[0].account_id, 'marketplace:user:alice');
    assert.equal(debits[0].amount_myz, '-25');
    assert.equal(debits[0].status, 'RECORDED');
    assert.equal(debits[0].reference.redemption_id, result.redemptionId);
    assert.equal(debits[0].reference.provider_transaction_id, 'mock-external-tx-1');
    assert.equal(Array.isArray(debits[0].evidence), true);
    assert.equal(debits[0].evidence.length, 1);
    assert.match(debits[0].evidence[0], /^sha256:[a-f0-9]{64}$/);

    // Exact replay must resolve to the existing redemption and never settle/debit twice.
    const replay = await reconciliation.start({
      provider: provider.name,
      fromAmount: '25',
      toAsset: 'EUR'
    }, { userId: 'alice' });
    assert.equal(replay.redemptionId, result.redemptionId);
    assert.equal(provider.executionCount, 1);

    const afterReplay = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    assert.equal(afterReplay.entries.filter(entry => entry.entry_type === 'ADJUSTMENT_DEBIT').length, 1);
    assert.equal((await ledgerAdapter.getCanonicalBalance('marketplace:user:alice')).balanceMyz, '75');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
