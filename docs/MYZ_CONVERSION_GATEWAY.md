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
Authorized external provider adapter
    ↓
External settlement
```

The gateway is deliberately **fail-closed**. No executable quote or settlement is returned until an authorized provider adapter is explicitly configured.

## Initial supported assets

- MYZ
- EUR
- USDC
- XMR

Support in the API means the asset is part of the gateway schema. It does **not** mean that a live MYZ/EUR, MYZ/USDC or MYZ/XMR market exists or that conversion is currently available.

## API

### `GET /api/conversion/capabilities`

Returns supported assets and the current execution model.

### `POST /api/conversion/quote`

Example request:

```json
{
  "from": "MYZ",
  "to": "EUR",
  "amount": "100.000000000000000000"
}
```

Amounts are decimal strings. Floating point amounts should not be used for financial persistence or settlement.

An executable response is accepted only from a configured provider adapter and should expose at least:

- provider quote ID
- rate
- provider fee
- MyZubster fee
- recipient amount
- expiry
- provider identity

Without a provider, the endpoint returns `503 CONVERSION_PROVIDER_UNAVAILABLE`.

### `POST /api/conversion/convert`

Execution is disabled in the initial scaffold and returns `503` until an authorized provider adapter implementing settlement is reviewed and enabled.

## Provider adapter contract

A provider adapter should implement:

```js
async getQuote({ from, to, amount, requestedBy })
async executeQuote({ quoteId, requestedBy, destination })
```

Provider responses must distinguish indicative information from executable quotes. The gateway must never synthesize external transaction IDs or mark settlement complete without independently verifiable provider evidence.

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
10. privacy and retention requirements.

## Design principle

The Marketplace should be able to swap provider adapters without changing the checkout domain model. If MyZubster later obtains the required authorization to internalize exchange activity, a dedicated provider adapter can be introduced and reviewed separately rather than rewriting marketplace checkout logic.
