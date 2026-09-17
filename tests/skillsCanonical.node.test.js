const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('skills route uses canonical Skill model fields', () => {
  const route = read('routes/skills.js');
  assert.match(route, /sellerId: req\.user\.id/);
  assert.match(route, /isActive: true/);
  assert.match(route, /name,/);
  assert.doesNotMatch(route, /seller_id\s*=/);
});

test('zero-price skill remains a free listing without payment coupling', () => {
  const route = read('routes/skills.js');
  assert.match(route, /price < 0/);
  assert.doesNotMatch(route, /cryptoPayment|conversionGateway|paymentIntent|cardNumber|cvv|cvc/i);
});

test('legacy title and status inputs remain compatible', () => {
  const route = read('routes/skills.js');
  assert.match(route, /req\.body\.name \|\| req\.body\.title/);
  assert.match(route, /req\.body\.status === 'active'/);
});
