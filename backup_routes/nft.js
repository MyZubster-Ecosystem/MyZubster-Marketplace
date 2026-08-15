// routes/nft.js
const express = require('express');
const router = express.Router();
const { mintSkillNFT, verifyNFTOwnership, getUserNFTs } = require('../services/nftService');
const auth = require('../middleware/auth');

// Mint NFT per una skill (richiede autenticazione)
router.post('/mint', auth, async (req, res) => {
  try {
    const { skillName, metadata } = req.body;
    if (!skillName) {
      return res.status(400).json({ error: 'Nome competenza richiesto' });
    }

    const result = await mintSkillNFT(req.user.id, skillName, metadata || {});
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      tokenId: result.tokenId,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('❌ Errore mint NFT:', error);
    res.status(500).json({ error: 'Errore mint NFT' });
  }
});

// Verifica possesso NFT
router.post('/verify', async (req, res) => {
  try {
    const { walletAddress, tokenId } = req.body;
    if (!walletAddress || !tokenId) {
      return res.status(400).json({ error: 'Wallet e tokenId richiesti' });
    }

    const hasNFT = await verifyNFTOwnership(walletAddress, tokenId);
    res.json({ hasNFT });
  } catch (error) {
    console.error('❌ Errore verifica NFT:', error);
    res.status(500).json({ error: 'Errore verifica NFT' });
  }
});

// Ottieni NFT di un utente
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const nfts = await getUserNFTs(walletAddress);
    res.json({ nfts });
  } catch (error) {
    console.error('❌ Errore recupero NFT:', error);
    res.status(500).json({ error: 'Errore recupero NFT' });
  }
});

module.exports = router;