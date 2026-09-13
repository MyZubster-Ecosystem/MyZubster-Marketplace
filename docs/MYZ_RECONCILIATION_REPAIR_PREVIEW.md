# MYZ Reconciliation Repair Preview

## Purpose

The repair preview engine answers a narrow operator question:

```text
Given this redemption ID, what repair would be considered, what evidence is still missing, and would the system block or allow a reviewed next step?
```

It never mutates redemption state, reservations, provider settlement, or the canonical MYZ ledger.

## Endpoint

```text
GET /api/conversion/operator/reconciliation/:redemptionId/repair-preview
```

Authentication uses the same dedicated operator token as the reconciliation report:

```text
Authorization: Bearer <MYZ_RECONCILIATION_OPERATOR_TOKEN>
```

## Decisions

The preview returns one of:

```text
WOULD_ALLOW_NO_ACTION
WOULD_BLOCK
WOULD_ALLOW_REVIEW
```

`WOULD_ALLOW_NO_ACTION` means the current local reconciliation state is internally consistent and no repair is proposed.

`WOULD_BLOCK` means one or more independent evidence requirements are missing or a trusted evidence adapter could not verify the required condition.

`WOULD_ALLOW_REVIEW` means all evidence requirements supplied to the preview engine by trusted internal adapters are verified, sourced and timestamped. It still does **not** execute a repair and does not grant authority to do so.

## Fail-closed evidence model

The public operator endpoint does not accept operator-supplied booleans such as:

```json
{
  "providerSettled": false,
  "canonicalDebitExists": false
}
```

Those assertions are not evidence.

A trusted evidence object must be produced by an internal integration and include at least:

```json
{
  "verified": true,
  "source": "provider-or-ledger-adapter",
  "checkedAt": "2026-09-13T03:00:00.000Z"
}
```

## Trusted canonical MYZ ledger evidence

The first trusted evidence adapter is read-only and queries the reviewed core MYZ ledger API. It is disabled unless both flags are explicit:

```text
MYZ_RECONCILIATION_LEDGER_EVIDENCE_ENABLED=true
MYZ_RECONCILIATION_LEDGER_EVIDENCE_APPROVED=true
```

It reuses:

```text
MYZ_LEDGER_API_URL
MYZ_LEDGER_API_KEY
MYZ_LEDGER_API_TIMEOUT_MS
```

The core API provides a read-only lookup contract:

```text
GET /api/v1/myz/entries/lookup
```

using an authorized account plus immutable selectors such as canonical entry ID, redemption ID, idempotency key or provider transaction reference.

The adapter can establish evidence keys including:

```text
canonicalDebitStatus
canonicalDebitLookup
canonicalDebitVerification
canonicalDebitOrReversalStatus
postDebitReversalStatus
```

The returned evidence includes the real canonical entry ID when found, recorded/reversed state, reversal entry reference and ledger revision. The Marketplace does not synthesize these values.

A successful lookup that finds no debit can verify a **status check** such as `canonicalDebitStatus=not_found`, but it does not count as a verified debit identity for `canonicalDebitLookup` or `canonicalDebitVerification`.

If the core evidence adapter is disabled or unavailable, the preview remains fail-closed and reports the adapter status without granting any repair path.

## Example: stale reservation

For `STALE_RESERVATION`, the preview requires independent confirmation of:

```text
providerSettlementStatus
canonicalDebitStatus
inFlightOperationStatus
```

The canonical ledger adapter can now satisfy `canonicalDebitStatus` from the core ledger, but the preview still blocks until provider and in-flight evidence are also supplied by trusted adapters.

The reservation age alone is never sufficient evidence for release.

## Example: settled but not reconciled

For `SETTLED_NOT_RECONCILED`, the engine requires:

```text
providerSettlementVerification
canonicalDebitStatus
```

The canonical side can be verified automatically when the evidence adapter is enabled. Provider settlement still requires its own independent trusted evidence source.

## Unknown findings

A finding code without a reviewed runbook always becomes:

```text
decision = WOULD_BLOCK
proposedAction = MANUAL_INVESTIGATION
missingEvidence = ["reviewed_runbook"]
```

The engine never guesses a repair policy for new failure classes.

## Non-mutation guarantee

The preview service and canonical evidence adapter use read-only queries. They cannot:

- release a reservation;
- write or reverse a canonical MYZ entry;
- retry external settlement;
- mark a redemption reconciled;
- alter provider evidence.

Every preview includes:

```text
mutatesState = false
automatedRepairAllowed = false
```

A future repair command must be implemented separately, with separate privilege, immutable audit, idempotency, fresh evidence checks and explicit preconditions.
