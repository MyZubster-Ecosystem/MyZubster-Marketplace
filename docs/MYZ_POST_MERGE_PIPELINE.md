# MYZ post-merge verification pipeline

The merged MYZ work is considered pipeline-verified only after real GitHub Actions runs complete successfully for both repositories.

Marketplace gates:

1. repository-wide CI (`.github/workflows/ci.yml`);
2. cross-repository canonical ledger contract (`myz-cross-repo-contract.yml`);
3. staging end-to-end gate (`myz-staging-e2e.yml`).

Core gates:

1. repository-wide CI in `MyZubster-Ecosystem/myzubster`;
2. dedicated canonical MYZ ledger contract (`myz-ledger-contract.yml`).

The staging end-to-end gate keeps `MYZ_ASSET_MODE=internal_credit`, disables the lease sweeper, uses MongoDB in CI, executes MYZ worker/reconciliation/recovery tests, validates the core ledger, and runs the cross-repo vertical slice. It never loads production provider credentials or enables real external settlement.
