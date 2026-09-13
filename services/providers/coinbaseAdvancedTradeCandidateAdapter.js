const axios = require('axios');

class CoinbaseAdvancedTradeCandidateAdapter {
  constructor(options = {}) {
    this.name = options.name || 'coinbase-advanced-trade';
    this.baseUrl = String(options.baseUrl || 'https://api.coinbase.com').replace(/\/$/, '');
    this.timeoutMs = Number(options.timeoutMs || 8000);
    this.sandbox = options.sandbox === true;
    this.myzExternalAssetId = String(options.myzExternalAssetId || '').trim().toUpperCase();
  }

  mapAsset(asset) {
    const normalized = String(asset || '').trim().toUpperCase();
    if (normalized === 'MYZ') {
      if (!this.myzExternalAssetId) {
        const error = new Error('MYZ has no approved external Coinbase asset mapping');
        error.code = 'MYZ_EXTERNAL_ASSET_NOT_CONFIGURED';
        throw error;
      }
      return this.myzExternalAssetId;
    }
    return normalized;
  }

  productId(from, to) {
    return `${this.mapAsset(from)}-${this.mapAsset(to)}`;
  }

  async getPublicProduct(from, to) {
    if (this.sandbox) {
      const error = new Error('Coinbase sandbox does not provide live public product discovery for this integration');
      error.code = 'PROVIDER_SANDBOX_MARKET_DATA_UNAVAILABLE';
      throw error;
    }

    const productId = this.productId(from, to);
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v3/brokerage/market/products/${encodeURIComponent(productId)}`,
        {
          timeout: this.timeoutMs,
          headers: { 'cache-control': 'no-cache' },
          validateStatus: status => status >= 200 && status < 300
        }
      );
      return response.data;
    } catch (error) {
      const unavailable = new Error(`Coinbase product ${productId} is unavailable or could not be verified`);
      unavailable.code = 'PROVIDER_PAIR_UNSUPPORTED';
      throw unavailable;
    }
  }

  async probePair({ from, to }) {
    const productId = this.productId(from, to);
    if (this.sandbox) {
      return {
        provider: this.name,
        productId,
        supported: false,
        executable: false,
        reason: 'sandbox_static_responses_only'
      };
    }

    const product = await this.getPublicProduct(from, to);
    const tradable = product && product.trading_disabled !== true && product.cancel_only !== true;
    return {
      provider: this.name,
      productId,
      supported: Boolean(product && product.product_id),
      tradable,
      executable: false,
      price: product && product.price ? String(product.price) : null,
      reason: 'candidate_market_probe_only'
    };
  }

  async getQuote(request) {
    const probe = await this.probePair(request);
    return {
      quoteId: null,
      provider: this.name,
      executable: false,
      probe
    };
  }

  async executeQuote() {
    const error = new Error('Coinbase candidate adapter cannot execute settlement');
    error.code = 'PROVIDER_EXECUTION_NOT_APPROVED';
    throw error;
  }
}

module.exports = CoinbaseAdvancedTradeCandidateAdapter;
