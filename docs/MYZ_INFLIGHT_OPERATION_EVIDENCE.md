# MYZ In-Flight Operation Evidence

## Purpose

This read-only adapter lets the reconciliation repair preview verify whether a redemption/reservation still has queued, running or retrying work before a release-oriented repair can even be considered.

It does not cancel, retry, reschedule, complete or mutate jobs.

## Configuration

The adapter remains disabled unless all required gates are explicit:

```text
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_ENABLED=true
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_APPROVED=true
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_URL=https://<reviewed-worker-evidence-service>
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_API_KEY=<service-secret>
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_TIMEOUT_MS=8000
```

Configuration is technical enablement only. It does not imply production readiness or approval of any external settlement path.

## Read-only facade contract

```text
GET /operations/lookup
```

The Marketplace supplies available immutable references such as:

```text
redemptionId
reservationId
quoteId
providerTransactionId
```

Expected schema:

```json
{
  "schema": "myzubster-in-flight-operation-evidence/v1",
  "status": "running",
  "redemptionId": "RED-123",
  "reservationId": "MYZR-123",
  "operationId": "OP-123",
  "operationType": "provider-settlement",
  "attempt": 1,
  "maxAttempts": 5,
  "leaseExpiresAt": "2026-09-13T03:10:00.000Z",
  "nextRetryAt": null,
  "startedAt": "2026-09-13T03:00:00.000Z",
  "completedAt": null,
  "evidenceRevision": "worker-registry-revision"
}
```

Supported source statuses:

```text
not_found
queued
running
retrying
completed
failed
cancelled
```

The adapter normalizes them into the safety key used by the repair preview:

```text
queued/running/retrying -> inFlightOperationStatus.status = active
not_found/completed/failed/cancelled -> inFlightOperationStatus.status = none
```

The raw worker state is preserved separately as `workerOperationStatus.status` and as `workerStatus` metadata on the normalized evidence object.

## Fail-closed semantics

For release-oriented findings such as `STALE_RESERVATION` and `ORPHAN_RESERVATION`, the preview requires:

```text
inFlightOperationStatus = none
```

If a trusted worker registry reports `queued`, `running` or `retrying`, the adapter produces `active` and the repair preview returns `WOULD_BLOCK` through its semantic evidence-conflict guard.

A terminal worker state does not by itself prove that MYZ may be released. Provider settlement evidence and canonical ledger evidence must still satisfy their own independent safety requirements.

## Trust boundaries

The evidence facade must be read-only and independently reviewed. The adapter rejects unsupported statuses and reference mismatches. Operator-provided booleans are not accepted as trusted evidence.

The adapter exposes no operation for:

- job cancellation;
- forced completion;
- retry scheduling;
- settlement execution;
- reservation release;
- canonical MYZ writes.

Every repair preview remains non-mutating and keeps `automatedRepairAllowed=false`.
