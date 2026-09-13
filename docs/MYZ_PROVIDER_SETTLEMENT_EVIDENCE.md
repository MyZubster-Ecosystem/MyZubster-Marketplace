# MYZ Provider Settlement Evidence Adapter

## Purpose

This component gives the operator repair-preview flow a trusted, read-only view of provider settlement state.

It does **not** execute settlement, retry a payout, issue a refund, reverse a transaction, move MYZ, or grant authority to repair accounting state.

The adapter is intentionally generic because no production MYZ settlement provider is currently approved or claimed by the project.

## Enablement

All gates must be explicit:

```text
MYZ_RECONCILIATION_PROVIDER_EVIDENCE_ENABLED=true
MYZ_RECONCILIATION_PROVIDER_EVIDENCE_APPROVED=true
MYZ_RECONCILIATION_PROVIDER_EVIDENCE_NAME=<reviewed-provider-name>
MYZ_RECONCILIATION_PROVIDER_EVIDENCE_URL=<reviewed-read-only-evidence-service>
MYZ_RECONCILIATION_PROVIDER_EVIDENCE_API_KEY=<service-secret>
```

If any required gate is absent, the provider evidence adapter remains disabled and the repair preview stays fail-closed when provider evidence is required.

`APPROVED=true` is only a deployment guard. It is not proof of legal authorization, provider partnership, MYZ listing, or regulatory approval.

## Read-only evidence contract

The configured evidence service must expose:

```text
GET /settlements/lookup
```

The adapter supplies immutable references when available:

```text
provider
providerTransactionId
redemptionId
quoteId
```

The response must use:

```text
schema = myzubster-provider-settlement-evidence/v1
```

Example settled response:

```json
{
  "schema": "myzubster-provider-settlement-evidence/v1",
  "provider": "reviewed-provider",
  "status": "settled",
  "providerTransactionId": "P-TX-1",
  "recipientAmount": "2.5",
  "toAsset": "EUR",
  "settledAt": "2026-09-13T03:00:00.000Z",
  "evidenceReference": "provider-proof-reference",
  "evidenceRevision": "optional-provider-snapshot-revision"
}
```

Allowed status values are:

```text
not_found
pending
settled
failed
reversed
refunded
```

Unknown statuses are rejected instead of being guessed.

## Verification semantics

A successful lookup does not automatically mean settlement is verified.

`providerSettlementStatus` can be verified for any valid provider response, including `not_found` or `pending`.

`providerSettlementVerification` is verified only when all of the following hold:

```text
status = settled
provider transaction reference matches
recipient amount matches Marketplace expectation
destination asset matches Marketplace expectation
```

A mismatch leaves settlement verification false even though the provider lookup itself succeeded.

Provider reversal evidence is considered verified only for explicit `reversed` or `refunded` states.

## Semantic fail-closed checks

The repair preview now evaluates both evidence presence **and evidence meaning**.

For example, a stale reservation cannot reach review for release merely because all evidence adapters responded. The trusted values must also show:

```text
provider settlement = not_found/none
canonical debit = not_found/none
in-flight operation = none
```

If provider evidence says `settled`, the preview returns `WOULD_BLOCK` with an evidence conflict even when all required evidence objects are present.

Likewise, `CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION` can only reach review when provider settlement is verified as `settled`, the canonical debit is verified as `recorded`, and no post-debit reversal is recorded.

## Security boundary

The evidence adapter:

- performs only authenticated GET requests;
- accepts no operator-supplied boolean as proof;
- rejects provider-name mismatches;
- rejects provider-transaction mismatches;
- records source and checked timestamp in each evidence object;
- never exposes write methods;
- never changes `MyzRedemption`, `MyzLedgerReservation`, provider state, or canonical ledger state.

A future provider-specific implementation may sit behind this generic evidence facade, but it must preserve these fail-closed properties and be separately reviewed before enablement.
