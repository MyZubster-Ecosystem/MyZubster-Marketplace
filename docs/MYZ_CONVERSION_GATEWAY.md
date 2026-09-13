# MYZ Conversion Gateway

## Goal

Provide a marketplace integration boundary for converting MYZ into supported settlement assets without making the Marketplace itself a custodial exchange.

Initial design:

```text
Buyer / Seller
    ↓
MyZubster Marketplace
    ↓
Conversion Gateway
    ↓
Quote + Fee Engine
    ↓
Authorized external provider adapter
    ↓
External settlement
    ↓
Settlement audit trail
```

The gateway is deliberately **fail-closed**. No executable quote or settlement is returned until an external provider adapter is explicitly enabled, explicitly approved and configured.

## Initial supported assets

- MYZ
- EUR
- USDC
- XMR

Support in the API means the asset is part of the gateway schema. It does **not** mean that a live MYZ/EUR, MYZ/USDC or MYZ/XMR market exists or that conversion is currently available.

## Fee model

The gateway separates two fees:

1. `providerFee` — reported by the external provider;
2. `myzubsterFee` — calculated by the Marketplace fee engine in basis points.

`MYZ_CONVERSION_FEE_BPS=100` means a 1.00% MyZubster service fee. The fee engine uses integer fixed-point arithmetic rather than JavaScript floating-point arithmetic.

The standardized provider quote must expose `grossRecipientAmount`, meaning the amount available to the recipient before the MyZubster service fee. The API then discloses:

- gross recipient amount;
- provider fee;
- MyZubster fee;
- final recipient amount;
- fee basis points.

No fee should be hidden in the gateway response.

## API

### `GET /api/conversion/capabilities`

Returns supported assets, configured provider names and the execution model.

### `POST /api/conversion/quote`

Example request:

```json
{
  "from": "MYZ",
  "to": "EUR",
  "amount": "100.000000000000000000"
}
```

Amounts are decimal strings. Floating point amounts must not be used for financial persistence or settlement.

An executable response is accepted only from a configured provider adapter and exposes:

- provider quote ID;
- rate;
- provider fee;
- gross recipient amount;
- MyZubster fee;
- final recipient amount;
- fee basis points;
- quote expiry;
- provider identity.

Every executable quote is persisted as a user-scoped `quote_issued` audit event. If the audit record cannot be persisted, quote creation fails closed.

Without a provider, the endpoint returns `503 CONVERSION_PROVIDER_UNAVAILABLE`.

### `POST /api/conversion/convert`

Example request:

```json
{
  "quoteId": "provider-quote-id"
}
```

Execution requires:

- an authenticated user;
- a persisted quote belonging to that user;
- a non-expired quote;
- no existing settled event;
- a configured provider implementing `executeQuote`;
- provider-returned settlement evidence.

The HTTP provider adapter sends `Idempotency-Key: myz-conversion-<quoteId>` on execution requests. The provider must honor idempotency for safe retry semantics.

The gateway never generates a synthetic provider transaction ID. Settlement becomes `settled` only when the provider returns a transaction identifier and settlement timestamp.

### `GET /api/conversion/audit/:quoteId`

Returns the authenticated user's audit trail for a quote, including quote issuance, execution request, settlement/failure, fees, expiry and settlement evidence hash.

Raw provider evidence is not exposed by this endpoint. A SHA-256 evidence hash is persisted with the settlement event so evidence can be compared without placing arbitrary provider payloads into the user-facing audit response.

## Provider adapter contract

The first adapter is a generic HTTP boundary configured through environment variables. It is deliberately not tied to or represented as any specific licensed provider.

A provider adapter implements:

```js
async getQuote({ from, to, amount, requestedBy })
async executeQuote({ quoteId, requestedBy })
```

Expected quote response fields:

```text
quoteId
rate
providerFee
grossRecipientAmount
expiresAt
executable=true
```

Expected settlement response fields:

```text
status=settled
providerTransactionId
settledAt
evidence (optional)
```

Provider responses must distinguish indicative information from executable quotes. The gateway must never synthesize external transaction IDs or mark settlement complete without independently verifiable provider evidence.

## Provider enablement

The HTTP adapter is registered only when all required deployment conditions are explicit:

```text
CONVERSION_PROVIDER_ENABLED=true
CONVERSION_PROVIDER_APPROVED=true
CONVERSION_PROVIDER_URL=https://...
```

`CONVERSION_PROVIDER_APPROVED` is a deployment guard, not proof of regulatory authorization. The operator must complete legal, compliance and provider due diligence before setting it to true.

## Compliance boundary

This module is an integration boundary, not a claim that MyZubster is licensed to provide regulated exchange services.

Before live conversion is enabled, the project should document and review:

1. which legal entity provides the exchange service;
2. whether the provider is authorized for the relevant jurisdiction and asset/service pair;
3. KYC/AML responsibilities and data flows;
4. custody and safeguarding boundaries;
5. fee and spread disclosure;
6. quote expiry and execution-price rules;
7. refund, failure and dispute handling;
8. sanctions and restricted-jurisdiction handling;
9. auditable settlement evidence;
10. privacy and retention requirements;
11. provider idempotency and duplicate-execution controls;
12. reconciliation between provider settlement and marketplace accounting.

## Design principle

The Marketplace should be able to swap provider adapters without changing the checkout domain model. If MyZubster later obtains the required authorization to internalize exchange activity, a dedicated provider adapter can be introduced and reviewed separately rather than rewriting marketplace checkout logic.
