# MYZ Redemption Settlement Worker

## Purpose

The redemption path now routes provider settlement through a registry-backed worker boundary instead of calling the provider directly from reconciliation code.

The lifecycle is:

```text
redemption created
  -> internal MYZ credit reserved
  -> redemption state settlement_requested
  -> worker operation queued
  -> lease acquired / running
  -> provider settlement attempt
  -> completed OR retrying OR failed
  -> validated settlement evidence
  -> redemption state settled
  -> provider reconciliation
  -> canonical MYZ debit
  -> reconciled
```

Every provider-settlement attempt therefore leaves independently queryable in-flight evidence in `MyzWorkerOperation`.

## Operation identity

Settlement operations use a deterministic operation ID derived from the redemption ID:

```text
MYZ-SETTLEMENT-<sha256(redemptionId) prefix>
```

The provider-facing idempotency key remains the redemption idempotency key. The worker registry does not replace provider idempotency.

## Lease semantics

Before provider execution, the worker must atomically acquire a lease from a `queued` or `retrying` operation. A lease records:

```text
leaseOwner
leaseExpiresAt
attempt
startedAt
```

A second worker cannot acquire the same operation while the lease is active.

## Retry policy

Automatic retry is fail-closed.

A provider error is retried only when the reviewed provider adapter explicitly sets:

```js
error.retryable = true
```

A generic timeout/error is **not** automatically considered retryable.

Configuration:

```text
MYZ_SETTLEMENT_WORKER_OWNER=marketplace-settlement-worker
MYZ_SETTLEMENT_WORKER_LEASE_MS=30000
MYZ_SETTLEMENT_WORKER_MAX_ATTEMPTS=1
MYZ_SETTLEMENT_WORKER_RETRY_DELAY_MS=0
```

The default `MAX_ATTEMPTS=1` means no automatic retry until an operator intentionally enables a higher reviewed value and the provider adapter marks a failure as retryable.

On a reviewed retryable failure:

```text
running -> retrying -> new lease -> running
```

On a non-retryable failure or exhausted attempts:

```text
running -> failed
```

On validated provider settlement:

```text
running -> completed
```

The completed registry record stores the provider transaction ID plus settlement metadata needed for correlation. It does not replace provider settlement evidence validation.

## Reconciliation safety

A completed worker operation is not sufficient to debit MYZ. The existing flow still separately requires:

1. validated provider settlement evidence;
2. provider reconciliation with `matched=true` and `commitInternalDebit=true`;
3. independently confirmed canonical MYZ debit.

Likewise, an active worker operation blocks release-oriented repair preview paths through the read-only worker evidence facade.

## HTTP surface

The worker mutation methods are internal service calls only. No public route can queue, lease, retry, fail, complete or cancel a worker operation.

The only exposed worker-registry endpoint remains:

```text
GET /api/operations/lookup
```

protected by `MYZ_WORKER_REGISTRY_READ_TOKEN` and used only as read-only operational evidence.

## Boundary

This worker lifecycle is infrastructure for a future reviewed external settlement path. It does not establish that any external provider supports MYZ, that a live MYZ market exists, or that MyZubster is authorized to provide exchange services.
