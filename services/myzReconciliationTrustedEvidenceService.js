'use strict';

const MyzCanonicalLedgerEvidenceAdapter = require('./myzCanonicalLedgerEvidenceAdapter');
const MyzProviderSettlementEvidenceAdapter = require('./myzProviderSettlementEvidenceAdapter');

function getCanonicalLedgerEvidenceAdapter() {
  if (process.env.MYZ_RECONCILIATION_LEDGER_EVIDENCE_ENABLED !== 'true') return null;
  if (process.env.MYZ_RECONCILIATION_LEDGER_EVIDENCE_APPROVED !== 'true') return null;
  if (!process.env.MYZ_LEDGER_API_URL) return null;
  return new MyzCanonicalLedgerEvidenceAdapter({
    baseUrl: process.env.MYZ_LEDGER_API_URL,
    apiKey: process.env.MYZ_LEDGER_API_KEY || null,
    reviewed: true,
    timeoutMs: process.env.MYZ_LEDGER_API_TIMEOUT_MS || 8000
  });
}

function getProviderSettlementEvidenceAdapter(report) {
  if (process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_ENABLED !== 'true') return null;
  if (process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_APPROVED !== 'true') return null;
  if (!process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_URL) return null;
  const providerName = String(process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_NAME || report?.redemption?.provider || '').trim();
  if (!providerName) return null;
  return new MyzProviderSettlementEvidenceAdapter({
    baseUrl: process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_URL,
    apiKey: process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_API_KEY || null,
    providerName,
    reviewed: true,
    timeoutMs: process.env.MYZ_RECONCILIATION_PROVIDER_EVIDENCE_TIMEOUT_MS || 8000
  });
}

async function collectTrustedEvidence(report) {
  let trustedEvidence = {};
  const evidenceAdapters = [];

  const adapters = [
    {
      source: 'canonical-myz-ledger-api',
      adapter: getCanonicalLedgerEvidenceAdapter()
    },
    {
      source: 'provider-settlement-evidence',
      adapter: getProviderSettlementEvidenceAdapter(report)
    }
  ];

  for (const item of adapters) {
    if (!item.adapter) {
      evidenceAdapters.push({ source: item.source, status: 'disabled' });
      continue;
    }
    try {
      const evidence = await item.adapter.collect(report);
      trustedEvidence = { ...trustedEvidence, ...evidence };
      evidenceAdapters.push({
        source: item.adapter.source || item.source,
        status: 'verified',
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      evidenceAdapters.push({
        source: item.adapter.source || item.source,
        status: 'unavailable',
        checkedAt: new Date().toISOString(),
        code: error.code || 'MYZ_RECONCILIATION_EVIDENCE_UNAVAILABLE'
      });
    }
  }

  return { trustedEvidence, evidenceAdapters };
}

module.exports = {
  getCanonicalLedgerEvidenceAdapter,
  getProviderSettlementEvidenceAdapter,
  collectTrustedEvidence
};
