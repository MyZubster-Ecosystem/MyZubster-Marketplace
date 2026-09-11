# Private geolocation and NFT safety

The Marketplace stores exact garden locations only as AES-256-GCM encrypted data. Public API responses use one of three explicit visibility levels:

| Visibility | Public coordinates | Public address | Precision |
| --- | --- | --- | --- |
| `private` | none | none | hidden |
| `approximate` | rounded to 2 decimals | none | about 1 km |
| `public` | exact, by explicit consent | allowed | exact |

New garden registrations require a Bearer token and `locationConsent: true`. The server records its own consent timestamp. `isPublic` defaults to `false`.

## Required configuration

Generate a 32-byte key outside the repository:

```bash
openssl rand -base64 32
```

Set these values in the deployment secret manager:

```dotenv
JWT_SECRET=<long-random-secret>
LOCATION_ENCRYPTION_KEY=<base64-or-64-hex-32-byte-key>
LOCATION_ENCRYPTION_KEY_VERSION=v1
NFT_MINT_MODE=disabled
```

Never commit these values. Keep old location keys available during key rotation until all records have been re-encrypted.

## Registration example

```json
{
  "name": "Community garden",
  "lat": 44.0637353,
  "lng": 12.5678873,
  "address": "Private street address",
  "comune": "Rimini",
  "country": "IT",
  "locationVisibility": "approximate",
  "locationConsent": true,
  "isPublic": true
}
```

The exact input is encrypted; the public response contains only `[12.57, 44.06]` and no street address.

## Legacy migration

Back up MongoDB, configure `MONGODB_URI` and the location key, then inspect and apply:

```bash
npm run privacy:migrate-locations
npm run privacy:migrate-locations -- --apply
```

The command is dry-run by default. Applied migrations force legacy records to `private`, remove public plaintext fields, and mark consent as `legacy-unverified`. Owners must explicitly opt in again before any location is republished.

## NFT boundary

NFT metadata never includes coordinates or street addresses. It contains only coarse labels and a SHA-256 commitment to the encrypted location payload.

The Marketplace does not currently have a configured chain runtime. `POST /api/nft/mint` therefore returns `503 NFT_RUNTIME_NOT_CONFIGURED` by default. Setting `NFT_MINT_MODE=simulation` enables an explicit off-chain simulation for development; responses always state `onChain: false` and no mint is presented as a blockchain transaction.

Real minting must remain disabled until the chain, contract address, signer custody, transaction receipt verification, persistence, and deployment network are configured and reviewed.
