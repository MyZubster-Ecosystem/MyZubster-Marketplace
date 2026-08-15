const express = require('express');
const router = express.Router();
const Garden = require('../models/Garden');

// Mint NFT
router.post('/mint', async (req, res) => {
  try {
    const { gardenId } = req.body;
    if (!gardenId) {
      return res.status(400).json({ error: 'gardenId is required' });
    }
    
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const tokenId = Math.floor(Math.random() * 1000000) + 1;
    garden.tokenId = tokenId;
    garden.nftMinted = true;
    await garden.save();
    
    res.json({
      success: true,
      data: { tokenId, gardenId: garden._id, message: 'NFT minted successfully' }
    });
  } catch (error) {
    console.error('Mint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lista NFT
router.get('/my-nfts', async (req, res) => {
  try {
    const gardens = await Garden.find({ nftMinted: true });
    res.json({ success: true, data: gardens });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dettaglio NFT per garden
router.get('/garden/:gardenId', async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.gardenId);
    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    if (!garden.tokenId) {
      return res.status(404).json({ error: 'NFT not minted for this garden' });
    }
    res.json({
      success: true,
      data: {
        tokenId: garden.tokenId,
        gardenId: garden._id,
        gardenName: garden.name,
        owner: garden.userId || '0x0000000000000000000000000000000000000000'
      }
    });
  } catch (error) {
    console.error('Garden NFT error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dettaglio NFT per tokenId - FIX FINALE
router.get('/token/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    console.log('🔍 Ricerca tokenId:', tokenId);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid tokenId' });
    }
    
    // Cerca il garden con il tokenId specificato
    const garden = await Garden.findOne({ tokenId: tokenId });
    console.log('📊 Risultato:', garden ? 'Trovato: ' + garden.name : 'Non trovato');
    
    if (!garden) {
      return res.status(404).json({ error: 'NFT not found for tokenId: ' + tokenId });
    }
    
    res.json({
      success: true,
      data: {
        tokenId: garden.tokenId,
        gardenId: garden._id,
        gardenName: garden.name,
        owner: garden.userId || '0x0000000000000000000000000000000000000000',
        location: garden.location,
        size: garden.size,
        crops: garden.crops,
        nftMinted: garden.nftMinted
      }
    });
  } catch (error) {
    console.error('Token NFT error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
