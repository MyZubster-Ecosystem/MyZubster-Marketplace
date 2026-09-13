# MYZ Worker Registry Facade

## Purpose

The Marketplace now contains a persistent worker-operation registry for reconciliation-related jobs. It stores queue state, retry state, attempt counters and leases in MongoDB so the repair preview can verify whether work is still active before an operator considers a release-oriented repair.

This does **not** add a public job-control API.

## Persistent model

`models/MyzWorkerOperation.js` stores:

- `operationId` and `operationType`;
- correlation references: `redemptionId`, `reservationId`, `quoteId`, `providerTransactionId`;
- state: `queued`, `running`, `retrying`, `completed`, `failed`, `cancelled`;
- `attempt` and `maxAttempts`;
- lease owner and expiry;
- next retry time;
- start/completion timestamps;
- last error code and bounded operational metadata.

Indexes support correlation lookup plus active lease/retry scanning.

## Internal registry service

`services/myzWorkerOperationRegistryService.js` is the write boundary intended for Marketplace worker code. It is not mounted as a public mutation route.

It currently exposes internal methods for:

```text
createQueued(...)
acquireLease(...)
markRetry(...)
markCompleted(...)
lookup(...)
```

`acquireLease` only moves `queued`/`retrying` work to `running` when no unexpired lease exists, increments the attempt counter atomically, and records the lease owner/expiry.

`markRetry` clears the lease and persists `nextRetryAt`; `markCompleted` clears lease/retry state and records completion.

Production workers should call this service around real execution instead of inventing in-flight state from local memory.

## Read-only evidence facade

The only HTTP surface added by this component is:

```text
GET /api/operations/lookup
```

It requires:

```text
Authorization: Bearer <MYZ_WORKER_REGISTRY_READ_TOKEN>
```

and at least one immutable selector:

```text
redemptionId
reservationId
quoteId
providerTransactionId
```

The response follows:

```text
myzubster-in-flight-operation-evidence/v1
```

If several operations match, an active `queued`, `running` or `retrying` operation is preferred over terminal history. If none match, the service returns `status=not_found` rather than fabricating an operation.

Every response includes a deterministic SHA-256 `evidenceRevision` derived from the selected operation state/lease/retry timestamps.

## Connecting the repair preview

For a same-service deployment, configure the existing in-flight evidence adapter to query the Marketplace itself:

```text
MYZ_WORKER_REGISTRY_READ_TOKEN=<long-random-secret>

MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_ENABLED=true
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_APPROVED=true
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_URL=https://<marketplace-host>/api
MYZ_RECONCILIATION_INFLIGHT_EVIDENCE_API_KEY=<same-secret>
```

The adapter then calls `/api/operations/lookup` and normalizes:

```text
queued/running/retrying -> active
completed/failed/cancelled/not_found -> none
```

An `active` result blocks `STALE_RESERVATION` and `ORPHAN_RESERVATION` release review.

## Fail-closed boundaries

- no read token configured -> `503`;
- invalid token -> `401`;
- database unavailable -> `503`;
- lookup without selector -> `400`;
- no public create/cancel/retry/complete route exists;
- the operator repair preview remains non-mutating;
- worker-registry evidence never proves provider settlement or canonical-ledger state by itself.

This is operational coordination infrastructure only. It does not enable MYZ external settlement, exchange activity or provider support.
