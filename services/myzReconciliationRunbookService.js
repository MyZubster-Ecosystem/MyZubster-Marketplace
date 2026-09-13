'use strict';

const RUNBOOKS = Object.freeze({
  ORPHAN_RESERVATION: {
    code: 'ORPHAN_RESERVATION',
    title: 'Reservation exists without redemption',
    risk: 'A reservation may lock MYZ credit without a corresponding redemption record.',
    operatorGoal: 'Determine whether the reservation is legitimate before any release is considered.',
    verify: [
      'Confirm the reservation ID, redemption ID, user/account ID, amount and idempotency key.',
      'Search application logs and audit records for the missing redemption creation attempt.',
      'Check whether any external provider settlement was requested or completed.',
      'Check the canonical MYZ ledger for a debit carrying the reservation/redemption references.'
    ],
    allowedOutcome: [
      'If no external settlement and no canonical debit exist, prepare a reviewed reservation-release action.',
      'If a canonical debit or external settlement exists, keep the reservation frozen and escalate for reconciliation.'
    ],
    never: [
      'Never release solely because the redemption record is missing.',
      'Never create a synthetic redemption or canonical debit to make records line up.'
    ],
    automatedRepairAllowed: false
  },
  REDEMPTION_FAILED: {
    code: 'REDEMPTION_FAILED',
    title: 'Redemption is failed',
    risk: 'The failure may have happened before settlement, after settlement, or during an ambiguous canonical debit.',
    operatorGoal: 'Classify the failure stage before changing any accounting state.',
    verify: [
      'Read failureCode, providerTransactionId, evidenceHash, reservation state and canonicalDebitEntryId.',
      'Verify provider settlement directly from provider evidence when a provider transaction ID exists.',
      'Verify the canonical MYZ ledger independently for a matching debit.',
      'Check whether the reservation remains reserved, is committed, released or failed.'
    ],
    allowedOutcome: [
      'Pre-settlement failures may be eligible for a reviewed release.',
      'Post-settlement failures require evidence-led reconciliation before any reservation change.',
      'Ambiguous debit outcomes remain frozen until the canonical ledger result is known.'
    ],
    never: [
      'Never infer that failed means no settlement occurred.',
      'Never automatically retry an external settlement from the operator report.'
    ],
    automatedRepairAllowed: false
  },
  SETTLED_NOT_RECONCILED: {
    code: 'SETTLED_NOT_RECONCILED',
    title: 'External settlement exists but reconciliation is incomplete',
    risk: 'Releasing MYZ credit could double-credit a user after an external payout already occurred.',
    operatorGoal: 'Determine whether the canonical MYZ debit exists and whether reconciliation can be completed safely.',
    verify: [
      'Verify the provider transaction ID and settlement evidence independently.',
      'Compare expected and actual recipient amount and destination asset.',
      'Query the canonical MYZ ledger for a debit tied to the redemption/idempotency reference.',
      'Confirm whether the local reservation is still reserved or already committed.'
    ],
    allowedOutcome: [
      'If the canonical debit exists and matches, prepare a reviewed metadata/state reconciliation only.',
      'If the canonical debit does not exist and settlement is confirmed, prepare a reviewed idempotent canonical debit using the original redemption references.',
      'If settlement evidence does not match, escalate; do not alter internal credit automatically.'
    ],
    never: [
      'Never release the MYZ reservation while confirmed external settlement exists unless a documented reversal/refund is independently verified.',
      'Never issue a second external settlement.'
    ],
    automatedRepairAllowed: false
  },
  REDEMPTION_ROLLED_BACK: {
    code: 'REDEMPTION_ROLLED_BACK',
    title: 'Redemption rolled back',
    risk: 'A rollback is only safe if no un-reversed external settlement and no committed canonical debit remain.',
    operatorGoal: 'Confirm the rollback corresponds to real settlement/accounting state.',
    verify: [
      'Confirm reservation state is released.',
      'Confirm no canonical debit exists, or that any debit was reversed canonically.',
      'Confirm no external settlement exists, or that provider refund/reversal is independently evidenced.'
    ],
    allowedOutcome: [
      'If all three checks match, close investigation as informational.',
      'If any check conflicts, escalate and freeze further repair.'
    ],
    never: ['Never treat a rolled_back application state as proof that provider or canonical ledger state was reversed.'],
    automatedRepairAllowed: false
  },
  RESERVATION_FAILED: {
    code: 'RESERVATION_FAILED',
    title: 'Reservation journal failure',
    risk: 'The local coordination record may not reflect canonical ledger or provider state.',
    operatorGoal: 'Reconstruct the actual state from canonical and provider evidence.',
    verify: [
      'Check canonical balance and matching debit entries.',
      'Check whether external settlement exists.',
      'Inspect reservation failureCode and timestamps.'
    ],
    allowedOutcome: ['Escalate to a reviewed repair path after evidence establishes the true state.'],
    never: ['Never mutate canonical MYZ balances from the reservation journal alone.'],
    automatedRepairAllowed: false
  },
  STALE_RESERVATION: {
    code: 'STALE_RESERVATION',
    title: 'Reservation remains active past threshold',
    risk: 'MYZ remains locked, but blindly releasing it can create double credit after a delayed settlement/debit.',
    operatorGoal: 'Prove that neither external settlement nor canonical debit exists before considering release.',
    verify: [
      'Check linked redemption state and failureCode.',
      'Check provider for settlement by quote/redemption/idempotency references.',
      'Check canonical ledger for a matching debit.',
      'Confirm there is no in-flight worker or retry using the same idempotency key.'
    ],
    allowedOutcome: [
      'Only when no settlement, no canonical debit and no in-flight operation are verified should a separate reviewed release command be considered.'
    ],
    never: [
      'Never use age alone as evidence that a reservation is safe to release.',
      'Never change the canonical ledger to compensate for a stale local record without evidence.'
    ],
    automatedRepairAllowed: false
  },
  COMMITTED_WITHOUT_CANONICAL_ENTRY: {
    code: 'COMMITTED_WITHOUT_CANONICAL_ENTRY',
    title: 'Reservation says committed but canonical entry ID is missing',
    risk: 'Local state claims a debit that cannot be directly referenced in the canonical ledger.',
    operatorGoal: 'Find the canonical debit by immutable references or prove that it never persisted.',
    verify: [
      'Search canonical ledger by idempotency key, redemption ID and provider transaction reference.',
      'Compare amount and account ID with the reservation.',
      'Do not rely solely on the local committed flag.'
    ],
    allowedOutcome: [
      'If a matching canonical debit exists, prepare a reviewed metadata repair to attach the real entry ID.',
      'If no matching debit exists, escalate; do not silently release or append another debit until idempotency state is understood.'
    ],
    never: ['Never invent a canonical entry ID.'],
    automatedRepairAllowed: false
  },
  RECONCILED_WITHOUT_COMMITTED_RESERVATION: {
    code: 'RECONCILED_WITHOUT_COMMITTED_RESERVATION',
    title: 'Redemption is reconciled but reservation is not committed',
    risk: 'The application-level terminal state conflicts with internal accounting coordination.',
    operatorGoal: 'Use canonical ledger evidence to determine which local state is wrong.',
    verify: [
      'Verify the canonical debit exists and matches account, amount and redemption reference.',
      'Verify external settlement evidence.',
      'Inspect reservation state and failure metadata.'
    ],
    allowedOutcome: [
      'If canonical debit and settlement are both verified, prepare a reviewed local reservation metadata/state repair.',
      'If the debit is absent or mismatched, reopen investigation; do not trust reconciled state.'
    ],
    never: ['Never append a new debit merely because redemption says reconciled.'],
    automatedRepairAllowed: false
  },
  ROLLBACK_WITH_UNRELEASED_RESERVATION: {
    code: 'ROLLBACK_WITH_UNRELEASED_RESERVATION',
    title: 'Rolled-back redemption still has locked MYZ',
    risk: 'Credit can remain unnecessarily locked, but release is unsafe if settlement/debit actually occurred.',
    operatorGoal: 'Verify rollback safety before any release.',
    verify: [
      'Verify there is no provider settlement, or verify a provider reversal/refund.',
      'Verify there is no canonical debit, or verify a canonical reversal.',
      'Confirm the reservation is still in a releasable pre-commit state.'
    ],
    allowedOutcome: ['Only after all checks pass, prepare a separately authorized reservation release.'],
    never: ['Never release a committed reservation; a canonical reversal is required instead.'],
    automatedRepairAllowed: false
  },
  CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION: {
    code: 'CANONICAL_DEBIT_WITHOUT_RECONCILED_REDEMPTION',
    title: 'Canonical debit exists but redemption is not reconciled',
    risk: 'The user balance may already be debited while the application reports failure or an intermediate state.',
    operatorGoal: 'Verify settlement and debit match before correcting only local metadata/state.',
    verify: [
      'Verify canonicalDebitEntryId against the canonical ledger.',
      'Verify account, amount, redemption ID and provider transaction reference.',
      'Verify the external settlement independently.',
      'Check whether any provider refund or canonical reversal occurred after the debit.'
    ],
    allowedOutcome: [
      'If settlement and debit both match and remain unreversed, prepare a reviewed local reconciliation-state repair.',
      'If settlement failed or was reversed, use a separate canonical reversal/refund runbook; do not merely mark reconciled.'
    ],
    never: [
      'Never release the reservation when a valid canonical debit remains recorded.',
      'Never mark reconciled without verifying external settlement.'
    ],
    automatedRepairAllowed: false
  }
});

function getRunbook(code) {
  return RUNBOOKS[String(code || '').trim()] || null;
}

function listRunbooks() {
  return Object.values(RUNBOOKS);
}

function attachRunbook(finding) {
  const runbook = getRunbook(finding?.code);
  return runbook ? { ...finding, runbook } : finding;
}

module.exports = { RUNBOOKS, getRunbook, listRunbooks, attachRunbook };
