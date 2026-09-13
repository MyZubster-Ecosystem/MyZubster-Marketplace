const VALID_MODES = Object.freeze(['internal_credit', 'redemption_bridge', 'external_asset']);

class MyzAssetIdentityService {
  constructor(env = process.env) {
    this.env = env;
  }

  getMode() {
    const mode = String(this.env.MYZ_ASSET_MODE || 'internal_credit').trim();
    return VALID_MODES.includes(mode) ? mode : 'internal_credit';
  }

  getStatus() {
    const mode = this.getMode();
    const externalAssetId = String(this.env.CONVERSION_MYZ_EXTERNAL_ASSET_ID || '').trim() || null;
    const network = String(this.env.MYZ_EXTERNAL_NETWORK || '').trim() || null;
    const redemptionRail = String(this.env.MYZ_REDEMPTION_RAIL || '').trim() || null;

    const requirements = {
      internal_credit: [],
      redemption_bridge: ['MYZ_REDEMPTION_RAIL'],
      external_asset: ['CONVERSION_MYZ_EXTERNAL_ASSET_ID', 'MYZ_EXTERNAL_NETWORK']
    }[mode];

    const missing = requirements.filter(name => {
      if (name === 'MYZ_REDEMPTION_RAIL') return !redemptionRail;
      if (name === 'CONVERSION_MYZ_EXTERNAL_ASSET_ID') return !externalAssetId;
      if (name === 'MYZ_EXTERNAL_NETWORK') return !network;
      return true;
    });

    return {
      asset: 'MYZ',
      mode,
      canonicalMeaning: mode === 'internal_credit'
        ? 'internal_platform_reward_accounting_credit'
        : mode,
      externallyTradable: mode === 'external_asset' && missing.length === 0,
      redemptionConfigured: mode === 'redemption_bridge' && missing.length === 0,
      externalAssetId,
      network,
      redemptionRail,
      ready: missing.length === 0,
      missingRequirements: missing,
      legalAuthorizationImplied: false,
      providerSupportImplied: false
    };
  }

  assertReadyForExternalUse() {
    const status = this.getStatus();
    if (status.mode === 'internal_credit') {
      const error = new Error('MYZ is currently an internal platform credit, not an externally tradable asset');
      error.code = 'MYZ_INTERNAL_CREDIT_ONLY';
      throw error;
    }
    if (!status.ready) {
      const error = new Error(`MYZ ${status.mode} configuration is incomplete`);
      error.code = 'MYZ_SETTLEMENT_CONFIGURATION_INCOMPLETE';
      error.missingRequirements = status.missingRequirements;
      throw error;
    }
    return status;
  }
}

module.exports = new MyzAssetIdentityService();
module.exports.MyzAssetIdentityService = MyzAssetIdentityService;
module.exports.VALID_MODES = VALID_MODES;
