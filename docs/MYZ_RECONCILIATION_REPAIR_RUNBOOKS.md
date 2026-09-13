# MYZ Reconciliation Repair Runbooks

## Purpose

These runbooks define what an operator should verify before any corrective action is designed for a MYZ redemption inconsistency.

They are deliberately **fail-closed**. The operator report remains read-only, and every runbook sets `automatedRepairAllowed=false`.

The objective is not to make inconsistent records look clean. The objective is to establish the real state across three independent domains before changing anything:

```text
external provider settlement
Marketplace redemption/reservation state
canonical MYZ ledger
```

No runbook grants authority to move funds, release credit, create a debit, reverse a debit, retry a provider settlement, or mark a redemption reconciled.

## Operator API

The runbook catalog is available only through the operator-token boundary:

```text
GET /api/conversion/operator/reconciliation/runbooks
GET /api/conversion/operator/reconciliation/runbooks/:code
```

Reconciliation report findings also include their matching runbook inline.

## Common evidence checklist

Before any repair proposal, capture and compare:

- redemption ID and quote ID;
- user/account ID;
- MYZ amount;
- reservation ID and reservation state;
- provider transaction ID and independently verified provider status;
- settlement evidence hash;
- canonical ledger revision;
- canonical debit entry ID, when present;
- idempotency key;
- timestamps and failure code;
- evidence of any provider refund/reversal;
- evidence of any canonical ledger reversal.

A local application state is never sufficient evidence by itself.

## Runbook: `STALE_RESERVATION`

A reservation that is old is not automatically safe to release.

Required checks:

1. inspect the linked redemption and failure stage;
2. verify the provider has not settled the redemption;
3. verify the canonical MYZ ledger has no matching debit;
4. verify no worker or retry remains in flight under the same idempotency key.

Only when all four are proven negative should a separate, reviewed release command be considered.

**Never use reservation age alone as release authority.**

## Runbook: `SETTLED_NOT_RECONCILED`

This is one of the highest-risk states because external value may already have been delivered.

Required checks:

1. independently verify the provider transaction and settlement status;
2. compare expected vs actual amount and destination asset;
3. search the canonical MYZ ledger for the matching redemption/idempotency references;
4. inspect whether the reservation is still `reserved` or already `committed`.

Possible reviewed outcomes:

- matching canonical debit exists -> repair only local reconciliation metadata/state;
- canonical debit absent but provider settlement is verified -> prepare one idempotent canonical debit using the original immutable references;
- settlement mismatch -> freeze and escalate.

**Never release MYZ while a confirmed external settlement remains unreversed. Never send a second external settlement.**

## Runbook: `CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION`

The canonical ledger is authoritative for internal MYZ accounting.

Required checks:

1. verify the canonical debit entry ID and entry contents;
2. verify account, amount, redemption reference and provider transaction reference;
3. verify external settlement independently;
4. check for later provider refund or canonical reversal.

If settlement and debit are both valid and unreversed, the repair should be limited to reviewed local metadata/state. If settlement failed or was reversed, a separate reversal/refund procedure is required.

**Never release a reservation while a valid canonical debit remains recorded.**

## Runbook: `COMMITTED_WITHOUT_CANONICAL_ENTRY`

A local `committed` flag is not proof that the canonical ledger persisted a debit.

Search the canonical ledger by:

```text
idempotency key
redemption ID
provider transaction ID
account ID + amount
```

If an exact canonical debit is found, attach its real entry ID through a reviewed metadata repair. If none is found, keep the case open until the idempotency outcome is understood.

**Never invent a canonical entry ID and never append a second debit merely to repair metadata.**

## Runbook: `ROLLBACK_WITH_UNRELEASED_RESERVATION`

A rolled-back application state does not prove provider or ledger rollback.

Before any reservation release, verify:

1. no provider settlement exists, or a verified provider refund/reversal exists;
2. no canonical debit exists, or a canonical reversal exists;
3. reservation state is still pre-commit and releasable.

Only then may a separately authorized release be considered.

## Runbook: `RECONCILED_WITHOUT_COMMITTED_RESERVATION`

Use the canonical ledger and provider evidence to decide which local state is inconsistent.

If both external settlement and canonical debit are verified, a reviewed local reservation-state repair may be appropriate. If either is missing, the `reconciled` state must not be trusted.

**Never create a new debit because the redemption says reconciled.**

## Runbook: `ORPHAN_RESERVATION`

A missing redemption record is not proof that nothing happened.

Check logs/audit records, provider settlement, canonical ledger references, reservation amount/account and idempotency key. If neither settlement nor debit exists, a reviewed release may be proposed. Otherwise keep the credit frozen and reconcile first.

## Runbook: `REDEMPTION_FAILED`

`failed` describes the application workflow, not necessarily the financial/accounting result.

Classify the failure as:

```text
pre-settlement
post-settlement / pre-debit
canonical-debit ambiguous
post-debit metadata failure
```

Each class has different safe actions. Ambiguous debit outcomes remain frozen until the canonical ledger result is independently known.

## Runbook: `RESERVATION_FAILED`

Treat the reservation journal as coordination metadata only. Reconstruct the true state from provider evidence and the canonical ledger before attempting any repair.

## Runbook: `REDEMPTION_ROLLED_BACK`

Confirm all three are true before closing the case:

```text
reservation released
no unreversed canonical debit
no unreversed external settlement
```

If any condition conflicts, reopen investigation.

## Repair-command design requirements

Any future mutation endpoint implementing a reviewed repair must satisfy all of the following:

- separate privileged authorization from the read-only operator token;
- explicit reason and operator identity;
- immutable audit record;
- idempotency key;
- precondition checks against current redemption + reservation state;
- fresh canonical ledger read before write;
- fresh provider evidence before any action affected by settlement state;
- no generic `force=true` bypass;
- dry-run/preview mode before execution;
- no automatic chaining of multiple financial/accounting mutations;
- fail closed on timeout, stale revision, conflicting evidence or partial failure.

Until those controls are implemented and reviewed, the operator surface remains read-only.
