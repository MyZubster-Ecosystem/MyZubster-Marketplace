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

`WOULD_BLOCK` means one or more independent evidence requirements are missing. No repair should be designed or executed from the current information.

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

In v1, the HTTP endpoint intentionally supplies no such evidence adapters, so any state-changing repair preview remains `WOULD_BLOCK`. This is deliberate.

## Example: stale reservation

For `STALE_RESERVATION`, the preview requires independent confirmation of:

```text
providerSettlementStatus
canonicalDebitStatus
inFlightOperationStatus
```

Without all three, the output remains:

```text
decision = WOULD_BLOCK
proposedAction = REVIEW_RESERVATION_RELEASE
automatedRepairAllowed = false
```

The reservation age alone is never sufficient evidence for release.

## Example: settled but not reconciled

For `SETTLED_NOT_RECONCILED`, the engine requires:

```text
providerSettlementVerification
canonicalDebitStatus
```

This prevents a repair path from releasing MYZ merely because local reconciliation stalled after an external payout.

## Unknown findings

A finding code without a reviewed runbook always becomes:

```text
decision = WOULD_BLOCK
proposedAction = MANUAL_INVESTIGATION
missingEvidence = ["reviewed_runbook"]
```

The engine never guesses a repair policy for new failure classes.

## Non-mutation guarantee

The preview service only transforms already-read reconciliation state and trusted evidence snapshots into a recommendation object. It has no write dependency on:

- `MyzRedemption`;
- `MyzLedgerReservation`;
- the canonical ledger write API;
- provider settlement execution;
- provider reversal/refund APIs.

Every preview includes:

```text
mutatesState = false
automatedRepairAllowed = false
```

A future repair command must be implemented separately, with separate privilege, immutable audit, idempotency, fresh evidence checks and explicit preconditions.
