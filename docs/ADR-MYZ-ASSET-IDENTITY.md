# ADR: MYZ Asset Identity and External Settlement States

Status: **Proposed / implementation guardrails active**

Related issues: #63, #64, #65, #66, #67, #68

## Context

The current MyZubster core architecture treats MYZ as an internal platform reward/accounting ledger. Historical work in `MyZubsterGateway` also explored a Tari wallet RPC integration under the wording "Tari (MYZ)". That historical integration evidence does not, by itself, establish that current MYZ is already an externally issued, listed or transferable Tari asset.

The conversion project needs one canonical answer to the question: **what is MYZ right now?**

Without an explicit state model, a provider adapter or checkout flow could accidentally treat an internal accounting credit as though it were an externally tradable crypto-asset.

## Decision

MYZ has three explicit identity states.

### 1. `internal_credit`

This is the current default and canonical state.

Properties:

- MYZ represents platform reward/accounting credit;
- it is not represented by the Marketplace as an externally tradable asset;
- no chain/network or contract/asset identifier is implied;
- external provider support is not implied;
- conversion code must fail closed when external-asset behavior is requested.

Configuration:

```text
MYZ_ASSET_MODE=internal_credit
```

### 2. `redemption_bridge`

A future mode for a reviewed mechanism that redeems internal MYZ credits through a separately defined settlement provider/rail.

This state is **not** automatically an exchange-service exemption, regulatory approval, or provider authorization. Legal/compliance review is still required before production use.

Minimum technical requirement:

```text
MYZ_ASSET_MODE=redemption_bridge
MYZ_REDEMPTION_RAIL=<real reviewed rail identifier>
```

The rail identifier must refer to a documented integration contract. It must not be an invented provider name used only to bypass safeguards.

A production redemption bridge must define at least:

1. quote source and price methodology;
2. reserve/debit sequencing for internal MYZ;
3. idempotent execution semantics;
4. external settlement evidence;
5. rollback/refund behavior;
6. reconciliation between internal ledger and external settlement;
7. KYC/AML, privacy, sanctions and custody responsibilities;
8. dispute and failure handling.

### 3. `external_asset`

A future state only when MYZ has a real external asset identity.

Minimum technical requirements:

```text
MYZ_ASSET_MODE=external_asset
CONVERSION_MYZ_EXTERNAL_ASSET_ID=<real asset identifier>
MYZ_EXTERNAL_NETWORK=<real network identifier>
```

Before this state is used in production, the project must also document:

- issuance/admission-to-trading path as applicable;
- authoritative supply/accounting model;
- custody model;
- price discovery and liquidity source;
- provider support for the exact asset/network/service pair;
- reconciliation with the internal MyZubster reward ledger;
- security and legal/compliance review.

## API contract

The conversion service exposes the current state at:

```text
GET /api/conversion/myz-status
```

The response distinguishes:

```text
mode
externallyTradable
redemptionConfigured
externalAssetId
network
redemptionRail
ready
missingRequirements
legalAuthorizationImplied=false
providerSupportImplied=false
```

The last two flags are deliberately always false. Configuration is not evidence of authorization, listing, partnership or provider support.

## Tari historical integration

`MyZubsterGateway` issue #257 historically described replacing a wallet stub with Tari wallet RPC calls and used the wording "Wallet reale per Tari (MYZ)". The current canonical ecosystem documentation, however, says MYZ is an internal reward/accounting ledger and treats the `tari` repository as an external/upstream dependency research track.

Therefore Tari is currently treated as **historical/experimental settlement research**, not as proof that MYZ already has a live Tari network asset identity.

A future decision may choose Tari as part of a real external settlement design, but that requires a new explicit asset identity, network semantics, provider/liquidity path and review.

## Consequences

Positive:

- checkout, provider adapters and documentation share one canonical MYZ identity state;
- internal credits cannot silently become external crypto-assets through configuration drift;
- future redemption and external-asset paths can be evaluated independently;
- provider integrations remain replaceable.

Trade-offs:

- live MYZ conversion remains blocked while `internal_credit` is canonical;
- additional provider, reconciliation and compliance work is required before any external settlement mode can be enabled;
- historical code using "MYZ" for external wallet rails must be interpreted carefully and migrated to explicit asset/rail identifiers.

## Recommended next implementation

Keep `internal_credit` as the default. Build and review the `redemption_bridge` contract before considering a new externally issued MYZ asset, because it lets the project test real settlement workflows without silently declaring that an external MYZ market already exists.

This recommendation is an architecture sequencing choice, not legal advice and not a conclusion that redemption activity is outside financial regulation.
