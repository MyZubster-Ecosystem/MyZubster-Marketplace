# MYZ CI status checklist

Post-merge verification is complete only when all of the following have a real successful GitHub Actions run on the relevant commit:

- Marketplace general CI (`ci.yml`)
- Marketplace MYZ cross-repo contract (`myz-cross-repo-contract.yml`)
- Marketplace MYZ staging end-to-end gate (`myz-staging-e2e.yml`)
- Core general CI (`myzubster/.github/workflows/ci.yml`)
- Core dedicated MYZ ledger contract (`myz-ledger-contract.yml`)

Do not report the MYZ conversion/redemption stack as CI-green until those run records exist and their relevant jobs have completed successfully.

A green result still proves software behavior only. It does not prove provider support, external MYZ settlement, legal authorization, custody approval, or production readiness.
