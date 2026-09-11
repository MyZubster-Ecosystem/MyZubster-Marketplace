const crypto = require('crypto');
const { nftLocationMetadata } = require('./locationPrivacyService');

class NFTService {
  constructor() {
    this.mode = process.env.NFT_MINT_MODE || 'disabled';
  }

  async mintNFT(garden) {
    if (this.mode !== 'simulation') {
      const error = new Error('On-chain NFT runtime is not configured');
      error.code = 'NFT_RUNTIME_NOT_CONFIGURED';
      throw error;
    }

    return {
      tokenId: crypto.randomInt(1, 2147483647),
      state: 'simulated',
      onChain: false,
      location: nftLocationMetadata(garden)
    };
  }

  async getGardenNFT(garden) {
    if (!garden || !garden.tokenId) return null;
    return {
      tokenId: garden.tokenId,
      state: garden.nftState || 'none',
      onChain: garden.nftState === 'minted',
      garden: {
        name: garden.name,
        location: nftLocationMetadata(garden),
        size: garden.size,
        crops: garden.crops
      }
    };
  }
}

module.exports = new NFTService();
