# MYZ Reconciliation Repair Preview

## Purpose

The repair preview engine answers a narrow operator question:

```text
Given this redemption ID, what repair would be considered, what evidence is still missing, and would the system block or allow a reviewed next step?
```

It never mutates redemption state, reservations, provider settlement, worker jobs, or the canonical MYZ ledger.

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

`WOULD_BLOCK` means one or more independent evidence requirements are missing **or trusted evidence conflicts with the safety conditions for the proposed repair**.

`WOULD_ALLOW_REVIEW` means all required evidence supplied by trusted internal adapters is verified, sourced, timestamped and semantically compatible. It still does **not** execute a repair and does not grant authority to do so.

## Fail-closed evidence model

The public operator endpoint does not accept operator-supplied booleans such as:

```json
{
  "providerSettled": false,
  "canonicalDebitExists": false,
  "workerActive": false
}
```

Those assertions are not evidence.

A trusted evidence object must be produced by an internal integration and include at least:

```json
{
  "verified": true,
  "source": "reviewed-evidence-adapter",
  "checkedAt": "2026-09-13T03:00:00.000Z",
  "status": "settled"
}
```

The preview can aggregate three independent read-only sources when explicitly configured:

```text
canonical MYZ ledger evidence adapter
provider settlement evidence adapter
in-flight/worker operation evidence adapter
```

No one source substitutes for another.

## Trusted canonical MYZ ledger evidence

The canonical adapter is disabled unless both flags are explicit:

```text
MYZ_RECONCILIATION_LEDGER_EVIDENCE_ENABLED=true
MYZ_RECONCILIATION_LEDGER_EVIDENCE_APPROVED=true
```

It can populate:

```text
canonicalDebitStatus
canonicalDebitLookup
canonicalDebitVerification
canonicalDebitOrReversalStatus
postDebitReversalStatus
```

A completed lookup with no debit can verify `canonicalDebitStatus=not_found`, but it does not become a verified debit identity.

## Trusted provider settlement evidence

The provider adapter is disabled unless its enablement and approval flags, provider name and evidence URL are explicitly configured.

It can populate:

```text
providerSettlementStatus
providerSettlementVerification
providerReversalStatus
providerSettlementOrReversalStatus
```

A provider lookup is not the same thing as settlement verification. `providerSettlementVerification` is true only when status is `settled` and the provider transaction reference, recipient amount and destination asset match Marketplace expectations.

See `MYZ_PROVIDER_SETTLEMENT_EVIDENCE.md` for the read-only contract.

## Trusted in-flight/worker evidence

The worker adapter is disabled unless both enablement and approval flags plus a reviewed evidence URL are configured.

It queries only:

```text
GET /operations/lookup
```

and can populate:

```text
inFlightOperationStatus
workerOperationStatus
```

Source worker states `queued`, `running` and `retrying` normalize to:

```text
inFlightOperationStatus = active
```

while `not_found`, `completed`, `failed` and `cancelled` normalize to:

```text
inFlightOperationStatus = none
```

The raw worker state, operation ID, attempt metadata, lease expiry and retry timing remain attached as evidence metadata. The adapter cannot cancel or retry jobs.

See `MYZ_INFLIGHT_OPERATION_EVIDENCE.md` for the read-only contract.

## Semantic safety checks

The engine does not merely count evidence objects. It also checks whether their verified status is safe for the proposed repair.

Example: `STALE_RESERVATION` requires:

```text
providerSettlementStatus = not_found/none
canonicalDebitStatus = not_found/none
inFlightOperationStatus = none
```

If all three evidence objects exist but provider status is `settled` or worker status normalizes to `active`, the preview returns:

```text
decision = WOULD_BLOCK
missingEvidence = []
evidenceConflicts = [...]
```

This prevents a fully populated but dangerous evidence set from enabling review of a reservation release.

A terminal worker result alone never proves release safety. Provider settlement and canonical ledger evidence must still independently satisfy their own requirements.

## Example: settled but not reconciled

For `SETTLED_NOT_RECONCILED`, the engine requires:

```text
providerSettlementVerification = settled and matching
canonicalDebitStatus = independently checked
```

The provider and canonical sides can be supplied automatically by their respective trusted read-only adapters when explicitly enabled.

## Unknown findings

A finding code without a reviewed runbook always becomes:

```text
decision = WOULD_BLOCK
proposedAction = MANUAL_INVESTIGATION
missingEvidence = ["reviewed_runbook"]
```

The engine never guesses a repair policy for new failure classes.

## Non-mutation guarantee

The preview service and evidence adapters use read-only queries. They cannot:

- release a reservation;
- write or reverse a canonical MYZ entry;
- retry external settlement;
- issue a provider refund/reversal;
- cancel or retry worker jobs;
- mark a redemption reconciled;
- alter evidence.

Every preview includes:

```text
mutatesState = false
automatedRepairAllowed = false
```

A future repair command must be implemented separately, with separate privilege, immutable audit, idempotency, fresh evidence checks and explicit preconditions.
