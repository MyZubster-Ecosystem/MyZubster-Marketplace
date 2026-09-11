require('dotenv').config();
const mongoose = require('mongoose');
const Garden = require('../models/Garden');
const { protectGardenLocation } = require('../services/locationPrivacyService');

const apply = process.argv.includes('--apply');

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (apply && !process.env.LOCATION_ENCRYPTION_KEY) {
    throw new Error('LOCATION_ENCRYPTION_KEY is required with --apply');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const candidates = await Garden.find({
    privateLocation: { $exists: false },
    $or: [
      { 'location.coordinates.0': { $exists: true } },
      { address: { $type: 'string', $ne: '' } },
      { comune: { $type: 'string', $ne: '' } }
    ]
  }).select('+privateLocation');

  console.log(`${apply ? 'Applying' : 'Dry run:'} ${candidates.length} legacy garden location(s)`);
  if (!apply) {
    console.log('No records changed. Re-run with --apply after backing up the database.');
    return;
  }

  let migrated = 0;
  for (const garden of candidates) {
    const protectedLocation = protectGardenLocation({
      location: garden.location,
      address: garden.address,
      comune: garden.comune,
      country: garden.country
    }, { forcePrivate: true, legacyMigration: true });

    garden.location = undefined;
    garden.address = undefined;
    garden.comune = undefined;
    garden.country = protectedLocation.publicCountry;
    garden.isPublic = false;
    garden.locationVisibility = protectedLocation.locationVisibility;
    garden.locationPrecision = protectedLocation.locationPrecision;
    garden.locationConsentVersion = protectedLocation.locationConsentVersion;
    garden.locationConsentedAt = undefined;
    garden.privateLocation = protectedLocation.privateLocation;
    await garden.save();
    migrated += 1;
  }

  console.log(`Migrated ${migrated} garden location(s); all legacy records are now private.`);
}

run()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
