# MYZ Worker Lease Recovery

## Purpose

The lease recovery sweeper detects settlement worker operations that are still marked `running` after their lease has expired.

An expired lease is treated as an **ambiguous settlement outcome**, not as permission to retry the external payment.

## State transition

```text
running + expired lease
        ↓
recovery_required
```

The sweeper never performs:

- provider settlement retry;
- provider refund or reversal;
- reservation release;
- canonical MYZ debit or reversal;
- redemption reconciliation-state mutation.

It only quarantines the worker operation for evidence-driven recovery.

## Why retry is unsafe

A worker can lose its lease after the provider has already accepted or completed settlement but before the Marketplace records the result. Automatically running the provider call again could duplicate an external payout.

Therefore `recovery_required` remains an active/in-flight safety state for repair preview purposes. Release-oriented repair paths stay blocked until independent provider settlement evidence and canonical-ledger evidence resolve the ambiguity.

## Quarantine metadata

When the registry quarantines an expired running operation it records:

```text
status = recovery_required
lastErrorCode = MYZ_SETTLEMENT_LEASE_EXPIRED_AMBIGUOUS
leaseOwner = null
leaseExpiresAt = null
nextRetryAt = null
metadata.recoveryRequiredAt
metadata.recoveryReason = expired_running_lease
metadata.previousLeaseOwner
metadata.previousLeaseExpiresAt
```

The transition uses an atomic compare against the original operation ID, `running` state and observed lease expiry so a concurrently completed or renewed worker is not overwritten by a stale sweep.

## Configuration

The periodic sweeper is disabled by default:

```text
MYZ_WORKER_LEASE_SWEEPER_ENABLED=false
MYZ_WORKER_LEASE_SWEEPER_INTERVAL_MS=30000
MYZ_WORKER_LEASE_SWEEPER_BATCH_SIZE=100
```

When enabled, it starts only after MongoDB connects successfully. The timer is unref'd and stopped when the Marketplace server closes.

## Evidence facade

`GET /api/operations/lookup` can return:

```json
{
  "schema": "myzubster-in-flight-operation-evidence/v1",
  "status": "recovery_required",
  "operationId": "...",
  "redemptionId": "...",
  "reservationId": "..."
}
```

The in-flight evidence adapter normalizes `recovery_required` to:

```text
inFlightOperationStatus.status = active
```

so reconciliation repair preview remains fail-closed.

## Recovery boundary

This implementation deliberately does not add an operator mutation endpoint for resolving `recovery_required`. Resolution must come from separately reviewed evidence and a future privileged recovery command with idempotency, immutable audit, fresh provider evidence and fresh canonical-ledger verification.
