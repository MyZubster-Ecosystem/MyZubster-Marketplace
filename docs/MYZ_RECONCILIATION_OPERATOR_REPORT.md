# MYZ Reconciliation Operator Report

## Purpose

This read-only operator surface helps investigate MYZ redemption states without changing balances, releasing reservations, replaying provider settlement, or mutating the canonical ledger.

It is operational tooling for the fail-closed redemption bridge. It does not imply that live MYZ redemption, exchange activity, a provider relationship, or regulatory authorization exists.

## Authentication

The operator endpoints use a dedicated bearer token:

```text
MYZ_RECONCILIATION_OPERATOR_TOKEN=<long-random-secret>
```

The token is separate from end-user JWT authentication and must never be shipped to a browser client or committed to source control. If the token is not configured, the endpoints return `503` rather than silently becoming public.

## API

### Summary report

```text
GET /api/conversion/operator/reconciliation
```

Optional query parameters:

```text
limit=100          # 1..500
staleMinutes=15    # 1..10080
```

The response includes state counts, investigation totals, severity totals, an `investigation` subset and recent joined redemption/reservation rows.

Each finding now carries its matching fail-closed operator runbook inline when a known runbook exists.

### Runbook catalog

```text
GET /api/conversion/operator/reconciliation/runbooks
GET /api/conversion/operator/reconciliation/runbooks/:code
```

Runbooks describe evidence to verify, permitted reviewed outcomes and actions that must never be taken automatically. They are guidance only; these endpoints expose no mutation capability.

### Single redemption report

```text
GET /api/conversion/operator/reconciliation/:redemptionId
```

Returns the sanitized redemption record, linked reservation and deterministic assessment for that redemption ID.

## Findings

The classifier currently detects:

```text
ORPHAN_RESERVATION
REDEMPTION_FAILED
SETTLED_NOT_RECONCILED
REDEMPTION_ROLLED_BACK
RESERVATION_FAILED
STALE_RESERVATION
COMMITTED_WITHOUT_CANONICAL_ENTRY
RECONCILED_WITHOUT_COMMITTED_RESERVATION
ROLLBACK_WITH_UNRELEASED_RESERVATION
CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION
```

High and medium severity findings set `requiresInvestigation=true`.

A healthy vertical slice should normally end as:

```text
redemption.state = reconciled
reservation.state = committed
reservation.canonicalDebitEntryId = <real canonical entry id>
```

## Important ambiguity rule

A `failed` redemption after an attempted canonical debit is not automatically repaired by releasing the reservation. The debit may have reached the canonical ledger even if the Marketplace did not receive the response.

The operator report highlights this condition so an operator can compare provider settlement evidence, Marketplace state and the canonical MYZ ledger before any corrective action is designed or executed.

## Runbook safety boundary

Every current runbook sets:

```text
automatedRepairAllowed = false
```

The runbooks explicitly reject shortcuts such as releasing credit based only on age, inventing canonical entry IDs, issuing a second external settlement, or treating a local `failed`/`rolled_back` state as proof of provider or ledger state.

The detailed procedures are documented in `docs/MYZ_RECONCILIATION_REPAIR_RUNBOOKS.md`.

## Read-only boundary

These endpoints intentionally do not expose repair actions.

They cannot:

- release a reservation;
- create or reverse a canonical MYZ entry;
- retry external settlement;
- mark a redemption reconciled;
- alter evidence hashes or provider transaction IDs.

Any future corrective command must use a separate privileged authorization boundary, explicit operator identity/reason, immutable audit evidence, idempotency, fresh provider and canonical-ledger verification, precondition checks and fail-closed handling for stale/ambiguous results.
