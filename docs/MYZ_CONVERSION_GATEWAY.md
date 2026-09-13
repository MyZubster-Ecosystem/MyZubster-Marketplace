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

## First technical provider candidate: Coinbase Advanced Trade

As of the 2026-09-13 integration review, Coinbase was selected as the first **technical candidate** to probe because:

- Coinbase states that Coinbase Luxembourg S.A. has MiCA authorization from Luxembourg's CSSF and provides crypto-asset services across the EEA;
- Coinbase documents an Advanced Trade REST API;
- Coinbase documents a static Advanced Trade sandbox that returns mocked responses in production-compatible formats.

References:

- https://help.coinbase.com/en/coinbase/other-topics/other/mica-cblu
- https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/overview
- https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/sandbox

This is **not** approval to use Coinbase for MYZ settlement and is not a representation that Coinbase supports MYZ. Regulatory status, commercial eligibility, supported assets, API terms and the exact legal entity serving a deployment must be re-verified before production use.

### Current blocker: MYZ is not an externally mapped provider asset

The Marketplace currently treats MYZ as an internal reward/accounting ledger. A third-party exchange cannot execute `MYZ/EUR`, `MYZ/USDC` or `MYZ/XMR` unless MYZ has an externally identifiable and provider-supported asset/market or another legally reviewed redemption/settlement mechanism exists.

For that reason, the Coinbase candidate adapter refuses every MYZ pair unless `CONVERSION_MYZ_EXTERNAL_ASSET_ID` is explicitly configured. Even with an asset ID configured, candidate mode remains non-executable and only probes provider market availability.

Do **not** set an invented symbol merely to bypass this guard. An external asset mapping must correspond to a real, reviewed asset supported by the provider.

Tracking issue: https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace/issues/63

## Candidate provider probing

Candidate probing is deliberately separate from the authorized execution-provider registry.

Enable the Coinbase candidate only for technical readiness checks:

```text
CONVERSION_COINBASE_CANDIDATE_ENABLED=true
CONVERSION_COINBASE_SANDBOX=true
CONVERSION_MYZ_EXTERNAL_ASSET_ID=
```

`GET /api/conversion/capabilities` reports candidate providers separately from configured execution providers.

`POST /api/conversion/provider-probe` checks whether a candidate can represent a pair without making it eligible for settlement.

Example:

```json
{
  "provider": "coinbase-advanced-trade",
  "from": "MYZ",
  "to": "EUR"
}
```

Without a reviewed external MYZ asset mapping, the probe fails with `MYZ_EXTERNAL_ASSET_NOT_CONFIGURED`.

Coinbase sandbox mode remains explicitly non-executable because its documented responses are static/mocked. It is useful for validating request/response plumbing, not for proving market liquidity or settlement.

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

Returns supported assets, configured execution-provider names, candidate-provider names and the execution model.

### `POST /api/conversion/provider-probe`

Performs a non-executable candidate-provider readiness check. A successful probe is **not** an executable quote and must not be shown to a user as a guaranteed exchange price.

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

The generic HTTP provider adapter sends `Idempotency-Key: myz-conversion-<quoteId>` on execution requests. The provider must honor idempotency for safe retry semantics.

The gateway never generates a synthetic provider transaction ID. Settlement becomes `settled` only when the provider returns a transaction identifier and settlement timestamp.

### `GET /api/conversion/audit/:quoteId`

Returns the authenticated user's audit trail for a quote, including quote issuance, execution request, settlement/failure, fees, expiry and settlement evidence hash.

Raw provider evidence is not exposed by this endpoint. A SHA-256 evidence hash is persisted with the settlement event so evidence can be compared without placing arbitrary provider payloads into the user-facing audit response.

## Provider adapter contract

The execution adapter is a generic HTTP boundary configured through environment variables. It is deliberately not tied to or represented as any specific licensed provider.

An execution provider adapter implements:

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

The generic HTTP execution adapter is registered only when all required deployment conditions are explicit:

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
3. whether MYZ itself is externally issued/admitted/tradable in a legally compliant way;
4. KYC/AML responsibilities and data flows;
5. custody and safeguarding boundaries;
6. fee and spread disclosure;
7. quote expiry and execution-price rules;
8. refund, failure and dispute handling;
9. sanctions and restricted-jurisdiction handling;
10. auditable settlement evidence;
11. privacy and retention requirements;
12. provider idempotency and duplicate-execution controls;
13. reconciliation between provider settlement and marketplace accounting.

## Design principle

The Marketplace should be able to swap provider adapters without changing the checkout domain model. If MyZubster later obtains the required authorization to internalize exchange activity, a dedicated provider adapter can be introduced and reviewed separately rather than rewriting marketplace checkout logic.
