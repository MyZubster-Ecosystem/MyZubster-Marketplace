const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Garden = require('../models/Garden');
const authenticate = require('../middleware/auth');
const { nftLocationMetadata, publicGarden } = require('../services/locationPrivacyService');

function nftResponse(garden) {
  const onChain = garden.nftState === 'minted';
  return {
    tokenId: garden.tokenId,
    gardenId: garden._id,
    gardenName: garden.name,
    state: garden.nftState || (garden.nftMinted ? 'minted' : 'none'),
    onChain,
    chain: onChain ? garden.nftChain : undefined,
    contractAddress: onChain ? garden.nftContractAddress : undefined,
    transactionHash: onChain ? garden.nftTransactionHash : undefined,
    location: nftLocationMetadata(garden),
    size: garden.size,
    crops: garden.crops
  };
}

// Mint NFT
router.post('/mint', authenticate, async (req, res) => {
  try {
    const { gardenId } = req.body;
    if (!gardenId) {
      return res.status(400).json({ error: 'gardenId is required' });
    }
    
    if (process.env.NFT_MINT_MODE !== 'simulation') {
      return res.status(503).json({
        error: 'On-chain NFT runtime is not configured',
        code: 'NFT_RUNTIME_NOT_CONFIGURED'
      });
    }

    const garden = await Garden.findById(gardenId).select('+privateLocation');
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    if (String(garden.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Garden ownership required' });
    }

    let tokenId;
    do {
      tokenId = crypto.randomInt(1, 2147483647);
    } while (await Garden.exists({ tokenId }));
    garden.tokenId = tokenId;
    garden.nftMinted = false;
    garden.nftState = 'simulated';
    await garden.save();
    
    res.json({
      success: true,
      data: {
        ...nftResponse(garden),
        mode: 'simulation',
        message: 'NFT simulation created; no blockchain transaction was sent'
      }
    });
  } catch (error) {
    console.error('Mint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lista NFT
router.get('/my-nfts', authenticate, async (req, res) => {
  try {
    const gardens = await Garden.find({
      userId: String(req.user.id),
      $or: [{ nftState: { $in: ['simulated', 'minted'] } }, { nftMinted: true }]
    }).select('+privateLocation');
    res.json({ success: true, data: gardens.map(nftResponse) });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dettaglio NFT per garden
router.get('/garden/:gardenId', async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.gardenId).select('+privateLocation');
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    if (!garden.tokenId || (!garden.nftMinted && !['simulated', 'minted'].includes(garden.nftState))) {
      return res.status(404).json({ error: 'NFT not minted for this garden' });
    }
    res.json({
      success: true,
      data: nftResponse(garden)
    });
  } catch (error) {
    console.error('Garden NFT error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dettaglio NFT per tokenId - FIX FINALE
router.get('/token/:tokenId', async (req, res) => {
  try {
    const tokenId = Number(req.params.tokenId);
    if (!Number.isSafeInteger(tokenId) || tokenId <= 0) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }
    
    const garden = await Garden.findOne({ tokenId }).select('+privateLocation');
    
    if (!garden) {
      return res.status(404).json({ error: 'NFT not found for tokenId: ' + tokenId });
    }
    
    res.json({
      success: true,
      data: nftResponse(garden)
    });
  } catch (error) {
    console.error('Token NFT error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
