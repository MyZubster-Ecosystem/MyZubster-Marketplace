# MYZ staging end-to-end gate

The workflow `.github/workflows/myz-staging-e2e.yml` is a CI staging harness for the merged MYZ redemption/conversion architecture.

It intentionally uses:

- MongoDB service container;
- Marketplace code under test;
- canonical `MyZubster-Ecosystem/myzubster@main` ledger code;
- the canonical ledger verifier;
- dedicated core ledger tests;
- Marketplace conversion/reconciliation/worker/recovery tests;
- the cross-repository vertical-slice contract test.

The default safety posture is:

```text
MYZ_ASSET_MODE=internal_credit
MYZ_WORKER_LEASE_SWEEPER_ENABLED=false
```

No live provider credentials are required or consumed. External settlement remains mocked/test-only. The workflow must not be interpreted as evidence of a live MYZ market, CASP authorization, exchange functionality, token listing, custody approval, or production settlement readiness.

The workflow can be run manually with an alternate core ref for compatibility checks, but its normal target is canonical core `main`.
