# MYZ Redemption Reconciliation

## Purpose

This document defines the fail-closed reconciliation path for a future `redemption_bridge` mode. It does not enable live redemption and does not represent MyZubster as an exchange, CASP, custodian or licensed payment provider.

The current canonical MYZ state remains `internal_credit` unless deployment configuration and the required reviews explicitly establish another state.

## Flow

```text
Canonical MYZ ledger balance
      ↓
Provider quote
      ↓
Persist quote_accepted record
      ↓
Local reservation journal
      ↓
credit_reserved
      ↓
Request external settlement
      ↓
settlement_requested
      ↓
Provider settlement evidence
      ↓
settled
      ↓
Provider reconciliation
      ↓
matched=true + commitInternalDebit=true
      ↓
Canonical MYZ ledger ADJUSTMENT_DEBIT
      ↓
reconciled
```

The external settlement provider no longer owns internal MYZ accounting. Internal reservation and canonical debit are handled through a separate reviewed ledger adapter.

## Canonical ledger boundary

The MyZubster core ledger specification is `myzubster-myz-ledger/v1` and defines MYZ as an internal reward/accounting unit. Marketplace code must not invent a MYZ balance or treat a local Mongo record as proof that the canonical ledger was debited.

`services/myzInternalLedgerAdapter.js` implements the Marketplace side of the boundary:

1. read the canonical account balance from the core ledger service;
2. subtract active Marketplace reservations to calculate currently available internal credit;
3. create a local `MyzLedgerReservation` record;
4. after independently evidenced external settlement and provider reconciliation, request an append-only canonical `ADJUSTMENT_DEBIT`;
5. require the core ledger service to return a matching `RECORDED` entry before the redemption can become `reconciled`.

The local reservation journal is coordination state only. It is not the canonical MYZ ledger.

Core implementation is tracked in `MyZubster-Ecosystem/myzubster#1095`.

## Canonical ledger API contract

Expected balance read:

```text
GET /v1/myz/accounts/:accountId/balance
```

Expected response:

```json
{
  "schema": "myzubster-myz-ledger-balance/v1",
  "asset": "MYZ",
  "balanceMyz": "100",
  "revision": "..."
}
```

Expected debit append:

```text
POST /v1/myz/entries
```

The Marketplace sends an idempotent `ADJUSTMENT_DEBIT` request linked to the redemption and provider transaction. The core service must return a matching canonical entry with:

```text
schema=myzubster-myz-ledger-entry/v1
asset=MYZ
entry_type=ADJUSTMENT_DEBIT
status=RECORDED
```

A timeout, malformed response or mismatched amount/account is not treated as a committed debit.

## Reservation journal

`models/MyzLedgerReservation.js` stores:

- reservation ID;
- redemption ID;
- authenticated user;
- canonical account ID;
- MYZ amount;
- state (`reserved`, `committed`, `released`, `failed`);
- canonical balance and revision observed at reserve time;
- canonical debit entry ID after commit;
- idempotency key;
- release/failure metadata.

Reservations use decimal-string arithmetic with up to 18 fractional digits. Normal JavaScript floating point is not used for spendability checks.

After creating a reservation the adapter re-checks total active reservations. If concurrent reservations would overcommit the observed canonical balance, the new reservation is released and the request fails closed.

## Ambiguous debit rule

A particularly dangerous case is:

```text
external settlement completed
      ↓
canonical debit POST sent
      ↓
network timeout / ambiguous response
```

The system must **not** automatically release the MYZ reservation in this situation. The core ledger may already have recorded the debit even though the Marketplace did not receive the confirmation.

Therefore an ambiguous canonical debit outcome becomes `failed` and requires manual/core-ledger reconciliation. This avoids restoring spendable MYZ that may already have been debited.

## State machine

Allowed redemption transitions:

```text
quote_accepted -> credit_reserved | failed
credit_reserved -> settlement_requested | rolled_back | failed
settlement_requested -> settled | rolled_back | failed
settled -> reconciled | rolled_back | failed
reconciled -> terminal
rolled_back -> terminal
failed -> terminal
```

Skipping states is rejected by code.

## Provider contract

A reviewed external redemption provider is responsible for:

```js
getRedemptionQuote()
executeExternalSettlement()
reconcileSettlement()
validateQuote()
validateSettlementEvidence()
```

The provider must not be trusted to mutate or self-confirm the internal MYZ ledger.

The reconciliation result must explicitly return both:

```text
matched=true
commitInternalDebit=true
```

before the Marketplace attempts the canonical internal debit.

## Rollback rule

Before an external settlement is confirmed, failures after reservation release the local reservation and end in `rolled_back` where safe.

If provider reconciliation explicitly reports a mismatch after settlement, the reservation is released and the redemption is recorded as `rolled_back`, but the external settlement mismatch still requires provider-specific operational handling.

If a canonical debit request has already been attempted and its outcome is ambiguous, automatic release is forbidden.

## Configuration

The canonical ledger bridge is registered only when all three conditions are explicit:

```text
MYZ_LEDGER_ADAPTER_ENABLED=true
MYZ_LEDGER_ADAPTER_APPROVED=true
MYZ_LEDGER_API_URL=https://...
```

Optional settings:

```text
MYZ_LEDGER_API_KEY=
MYZ_LEDGER_API_TIMEOUT_MS=8000
MYZ_LEDGER_ACCOUNT_PREFIX=marketplace:user:
```

`APPROVED=true` is a deployment guard, not legal authorization and not proof that the core API is production-ready.

## API

### `POST /api/conversion/redemption/start`

Starts the state machine only when:

- the authenticated user exists;
- MYZ is configured as `redemption_bridge`;
- identity configuration is complete;
- a reviewed redemption provider has been registered;
- a reviewed canonical MYZ ledger adapter has been configured;
- the provider returns a valid, non-expired quote;
- sufficient canonical internal MYZ credit is available after active reservations.

With the default project configuration, this endpoint remains fail-closed.

### `GET /api/conversion/redemption/:redemptionId`

Returns the authenticated user's reconciliation record without exposing raw provider evidence.

### `GET /api/conversion/capabilities`

Includes `ledgerAdapterConfigured` so operators can distinguish provider readiness from internal-ledger readiness.

## Non-negotiable boundaries

- `internal_credit` must never be treated as an externally tradable asset by implication.
- Local reservations are not canonical debits.
- No internal debit is final until the core ledger returns a matching `RECORDED` entry.
- External providers cannot self-confirm internal MYZ accounting.
- Provider transaction IDs and canonical ledger entry IDs are never synthesized.
- Ambiguous debit outcomes fail closed and require reconciliation.
- Configuration flags do not constitute legal authorization, listing, provider support or regulatory approval.

## Remaining production work

Before a real redemption bridge can be enabled, the core MYZ ledger API in issue #1095 must be implemented and integration-tested, a concrete reviewed external settlement provider/rail must be selected, provider-specific exception/reversal procedures must be documented, and security plus legal/compliance review must be completed for the target jurisdictions.
