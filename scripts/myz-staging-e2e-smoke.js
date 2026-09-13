'use strict';

// This smoke marker is intentionally non-networked. The real staging gate is the
// GitHub Actions workflow that composes MongoDB, Marketplace tests, core ledger
// tests and the cross-repository vertical slice. Keeping this script side-effect
// free avoids accidentally enabling a live settlement path from CI.

const required = {
  assetMode: process.env.MYZ_ASSET_MODE,
  sweeper: process.env.MYZ_WORKER_LEASE_SWEEPER_ENABLED
};

if (required.assetMode !== 'internal_credit') {
  throw new Error('MYZ staging smoke requires MYZ_ASSET_MODE=internal_credit');
}
if (required.sweeper !== 'false') {
  throw new Error('MYZ staging smoke requires lease sweeper disabled');
}

console.log(JSON.stringify({
  schema: 'myzubster-myz-staging-smoke/v1',
  ok: true,
  liveSettlementEnabled: false,
  assetMode: required.assetMode,
  leaseSweeperEnabled: false
}, null, 2));
