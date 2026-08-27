const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const VISIBILITIES = new Set(['private', 'approximate', 'public']);

class LocationPrivacyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LocationPrivacyError';
    this.code = code;
  }
}

function encryptionKey() {
  const raw = process.env.LOCATION_ENCRYPTION_KEY;
  if (!raw) throw new LocationPrivacyError('LOCATION_ENCRYPTION_KEY is required', 'LOCATION_KEY_MISSING');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new LocationPrivacyError('LOCATION_ENCRYPTION_KEY must decode to 32 bytes', 'LOCATION_KEY_INVALID');
  }
  return key;
}

function coordinate(value, min, max, name) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new LocationPrivacyError(`${name} is invalid`, 'LOCATION_COORDINATE_INVALID');
  }
  return parsed;
}

function text(value, max = 300) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function encrypt(exact) {
  const keyVersion = process.env.LOCATION_ENCRYPTION_KEY_VERSION || 'v1';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`myzubster-location:${keyVersion}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(exact), 'utf8'), cipher.final()]);
  return {
    algorithm: ALGORITHM,
    keyVersion,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function extractCoordinates(input) {
  const values = input && input.location && Array.isArray(input.location.coordinates)
    ? { lng: input.location.coordinates[0], lat: input.location.coordinates[1] }
    : { lat: input.lat ?? input.latitude, lng: input.lng ?? input.longitude };
  const lat = coordinate(values.lat, -90, 90, 'latitude');
  const lng = coordinate(values.lng, -180, 180, 'longitude');
  if ((lat === undefined) !== (lng === undefined)) {
    throw new LocationPrivacyError('latitude and longitude must be supplied together', 'LOCATION_PAIR_REQUIRED');
  }
  return { lat, lng };
}

function protectGardenLocation(input = {}, options = {}) {
  const visibility = options.forcePrivate
    ? 'private'
    : input.locationVisibility || input.visibility || 'approximate';
  if (!VISIBILITIES.has(visibility)) {
    throw new LocationPrivacyError('invalid location visibility', 'LOCATION_VISIBILITY_INVALID');
  }
  if (!options.legacyMigration && input.locationConsent !== true && input.consentGranted !== true) {
    throw new LocationPrivacyError('explicit location consent is required', 'LOCATION_CONSENT_REQUIRED');
  }

  const { lat, lng } = extractCoordinates(input);
  const exact = {
    lat,
    lng,
    address: text(input.address),
    city: text(input.city || input.comune, 120),
    country: text(input.country, 120)
  };
  const hasData = Object.values(exact).some(value => value !== undefined);
  if (!hasData) throw new LocationPrivacyError('location data is required', 'LOCATION_DATA_REQUIRED');

  const rounded = value => value === undefined ? undefined : Math.round(value * 100) / 100;
  const publicLocation = visibility === 'private' || lat === undefined
    ? undefined
    : {
        type: 'Point',
        coordinates: visibility === 'public' ? [lng, lat] : [rounded(lng), rounded(lat)]
      };

  return {
    publicLocation,
    publicAddress: visibility === 'public' ? exact.address : undefined,
    publicCity: visibility === 'private' ? undefined : exact.city,
    publicCountry: exact.country,
    locationVisibility: visibility,
    locationPrecision: visibility === 'public' ? 'exact' : visibility === 'approximate' ? 'approx-1km' : 'hidden',
    locationConsentVersion: options.legacyMigration
      ? 'legacy-unverified'
      : text(input.locationConsentVersion || input.consentVersion, 80) || 'location-privacy-v1',
    locationConsentedAt: options.legacyMigration ? undefined : new Date(),
    privateLocation: encrypt(exact)
  };
}

function publicGarden(garden) {
  const data = typeof garden.toObject === 'function' ? garden.toObject() : { ...garden };
  const visibility = VISIBILITIES.has(data.locationVisibility) ? data.locationVisibility : 'private';
  delete data.privateLocation;
  delete data.userId;
  delete data.locationConsentVersion;
  delete data.locationConsentedAt;

  if (data.isPublic !== true || visibility === 'private') {
    delete data.location;
    delete data.address;
    delete data.comune;
  } else if (visibility === 'approximate') {
    delete data.address;
    if (data.location && Array.isArray(data.location.coordinates)) {
      data.location.coordinates = data.location.coordinates.map(value => Math.round(value * 100) / 100);
    }
  }

  data.locationVisibility = visibility;
  data.locationPrecision = visibility === 'public' ? 'exact' : visibility === 'approximate' ? 'approx-1km' : 'hidden';
  return data;
}

function nftLocationMetadata(garden) {
  const projected = publicGarden(garden);
  const metadata = {
    visibility: projected.locationVisibility,
    city: projected.comune,
    country: projected.country
  };

  const privateLocation = garden.privateLocation && typeof garden.privateLocation.toObject === 'function'
    ? garden.privateLocation.toObject()
    : garden.privateLocation;
  if (privateLocation && privateLocation.ciphertext) {
    metadata.commitment = crypto
      .createHash('sha256')
      .update(`${privateLocation.ciphertext}.${privateLocation.authTag}`)
      .digest('hex');
  }

  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

module.exports = {
  LocationPrivacyError,
  protectGardenLocation,
  publicGarden,
  nftLocationMetadata
};
