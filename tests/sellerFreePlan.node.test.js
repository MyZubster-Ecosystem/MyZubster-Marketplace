const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('seller registration defaults to free and requires no card', () => {
  const auth = read('routes/auth.js');
  const user = read('models/User.js');
  assert.match(auth, /requestedRole === 'seller'/);
  assert.match(auth, /creditCardRequired: false/);
  assert.match(auth, /upgradeRequiresPaymentMethod: true/);
  assert.match(user, /sellerPlan: \{ type: String, enum: \['free', 'paid'\], default: 'free' \}/);
  assert.match(user, /sellerPaymentMethodStatus: \{ type: String, enum: \['not_required', 'required', 'configured'\], default: 'not_required' \}/);
});

test('paid upgrade fails closed until reviewed billing provider exists', () => {
  const plans = read('routes/sellerPlans.js');
  assert.match(plans, /SELLER_BILLING_PROVIDER_NOT_CONFIGURED/);
  assert.match(plans, /rawCardDataAccepted: false/);
  assert.match(plans, /paymentMethodRequired: true/);
  assert.doesNotMatch(plans, /cardNumber|cvv|cvc/i);
});

test('seller plan API is mounted', () => {
  const server = read('server.js');
  assert.match(server, /app\.use\('\/api\/seller', sellerPlanRoutes\)/);
});
