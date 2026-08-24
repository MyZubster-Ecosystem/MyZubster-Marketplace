const test = require('node:test');
const assert = require('node:assert/strict');
const {
  protectGardenLocation,
  publicGarden,
  nftLocationMetadata
} = require('../services/locationPrivacyService');

process.env.LOCATION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

test('garden location is encrypted and approximately projected', () => {
  const protectedLocation = protectGardenLocation({
    lat: 44.0637353,
    lng: 12.5678873,
    address: 'Via privata 1',
    comune: 'Rimini',
    country: 'IT',
    locationConsent: true
  });

  assert.deepEqual(protectedLocation.publicLocation.coordinates, [12.57, 44.06]);
  assert.equal(protectedLocation.publicAddress, undefined);
  assert.equal(JSON.stringify(protectedLocation.privateLocation).includes('Via privata 1'), false);
});

test('private garden output exposes no coordinates, address or owner id', () => {
  const output = publicGarden({
    name: 'Private garden',
    isPublic: false,
    userId: 'owner-123',
    address: 'Via privata 1',
    comune: 'Rimini',
    locationVisibility: 'private',
    location: { type: 'Point', coordinates: [12.567, 44.063] },
    privateLocation: { ciphertext: 'secret' }
  });

  assert.equal(output.location, undefined);
  assert.equal(output.address, undefined);
  assert.equal(output.comune, undefined);
  assert.equal(output.userId, undefined);
});

test('NFT metadata never contains coordinates or street address', () => {
  const metadata = nftLocationMetadata({
    isPublic: true,
    locationVisibility: 'public',
    comune: 'Rimini',
    country: 'IT',
    address: 'Via privata 1',
    location: { type: 'Point', coordinates: [12.567, 44.063] },
    privateLocation: { ciphertext: 'ciphertext', authTag: 'tag' }
  });

  assert.deepEqual(Object.keys(metadata).sort(), ['city', 'commitment', 'country', 'visibility']);
  assert.match(metadata.commitment, /^[a-f0-9]{64}$/);
});

test('new location data requires explicit consent', () => {
  assert.throws(
    () => protectGardenLocation({ lat: 44, lng: 12 }),
    /explicit location consent/
  );
});

test('legacy migration is forced private and marked unverified', () => {
  const protectedLocation = protectGardenLocation({
    lat: 44.0637,
    lng: 12.5678,
    address: 'Legacy address'
  }, { forcePrivate: true, legacyMigration: true });

  assert.equal(protectedLocation.publicLocation, undefined);
  assert.equal(protectedLocation.publicAddress, undefined);
  assert.equal(protectedLocation.locationVisibility, 'private');
  assert.equal(protectedLocation.locationConsentVersion, 'legacy-unverified');
  assert.equal(protectedLocation.locationConsentedAt, undefined);
});
