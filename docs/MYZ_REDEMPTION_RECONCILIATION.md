# MYZ Redemption Reconciliation

## Purpose

This document defines the fail-closed reconciliation path for a future `redemption_bridge` mode. It does not enable live redemption and does not represent MyZubster as an exchange, CASP, custodian or licensed payment provider.

The current canonical MYZ state remains `internal_credit` unless deployment configuration and the required reviews explicitly establish another state.

## Flow

```text
Internal MYZ credit
      ↓
Provider quote
      ↓
Persist quote_accepted record
      ↓
Reserve internal credit
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
Reconcile expected vs actual settlement
      ↓
 matched + provider authorizes debit commit
      ↓
reconciled
```

Any mismatch or unverified failure after reservation must attempt reservation release and end in `rolled_back`. If release itself cannot be verified, the record ends in `failed` and requires manual investigation.

## State machine

Allowed transitions:

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

## Persistence

`models/MyzRedemption.js` stores a user-scoped record containing:

- redemption ID;
- provider quote ID;
- provider name;
- MYZ amount;
- destination asset;
- expected recipient amount;
- current state;
- internal reservation ID;
- provider transaction ID;
- SHA-256 evidence hash;
- idempotency key;
- failure/reconciliation metadata.

The idempotency key is derived from provider quote ID and authenticated user identity. Duplicate start requests should resolve to the existing record rather than silently create a second redemption.

## Provider contract

A reviewed redemption adapter must implement:

```js
getRedemptionQuote()
reserveInternalCredit()
executeExternalSettlement()
releaseReservation()
reconcileSettlement()
validateQuote()
validateSettlementEvidence()
```

The reconciliation result must explicitly return both:

```text
matched=true
commitInternalDebit=true
```

before a redemption can become `reconciled`.

External settlement alone is not enough to commit the internal debit. The expected amount, actual amount, destination asset, reservation and provider transaction must be reconciled first.

## Rollback rule

If reconciliation does not match, the service calls `releaseReservation()` and records `rolled_back`.

If provider settlement has occurred but the internal side cannot be reconciled, this is an exception condition requiring provider-specific operational handling. The generic service records the mismatch instead of pretending the accounting is complete.

## API

### `POST /api/conversion/redemption/start`

Starts the state machine only when:

- the authenticated user exists;
- MYZ is configured as `redemption_bridge`;
- the identity configuration is complete;
- a reviewed redemption provider has been registered;
- the provider returns a valid, non-expired quote.

With the default project configuration, this endpoint fails closed because no live redemption provider is registered.

### `GET /api/conversion/redemption/:redemptionId`

Returns the authenticated user's reconciliation record without exposing raw provider evidence.

## Non-negotiable boundaries

- `internal_credit` must never be treated as an externally tradable asset by implication.
- No production provider is registered merely because a contract class exists.
- No internal debit is considered final until reconciliation explicitly authorizes commit.
- Provider transaction IDs are never synthesized.
- Raw settlement evidence is not exposed to users; an evidence hash is persisted for comparison and audit.
- Configuration flags do not constitute legal authorization, listing, provider support or regulatory approval.

## Remaining production work

Before a real redemption bridge can be enabled, the project still needs a concrete reviewed provider/rail, a real internal-ledger reservation/debit adapter, provider-specific reversal and exception procedures, reconciliation reporting, security review, and legal/compliance review for the target jurisdictions.
