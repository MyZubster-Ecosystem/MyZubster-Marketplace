/**
 * EVA IONI - NFC Management Routes
 * Gestisce la registrazione e il riconoscimento di piante e animali
 */

const express = require('express');
const router = express.Router();
const NFC = require('../models/NFC');

// ============================================================
// SCANNA TAG NFC
// ============================================================

router.get('/scan', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: 'UID required' });
    }

    let record = await NFC.findOne({ uid });
    
    if (!record) {
      return res.status(404).json({ 
        message: 'Tag not registered',
        uid: uid 
      });
    }

    // Registra l'ultima scansione
    record.lastSeen = new Date();
    record.scanCount = (record.scanCount || 0) + 1;
    await record.save();

    res.json({
      success: true,
      data: {
        uid: record.uid,
        type: record.type,
        name: record.name,
        description: record.description,
        lastSeen: record.lastSeen,
        scanCount: record.scanCount,
        metadata: record.metadata
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// REGISTRA TAG NFC
// ============================================================

router.post('/register', async (req, res) => {
  try {
    const { uid, type, name, description, metadata } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'UID required' });
    }

    // Verifica se esiste già
    let existing = await NFC.findOne({ uid });
    if (existing) {
      return res.status(409).json({ 
        error: 'Tag already registered',
        data: existing 
      });
    }

    const record = new NFC({
      uid,
      type: type || 'unknown',
      name: name || 'Nuova pianta/animale',
      description: description || '',
      metadata: metadata || {},
      createdAt: new Date(),
      lastSeen: new Date(),
      scanCount: 0
    });

    await record.save();

    res.json({
      success: true,
      message: 'Tag registered successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AGGIORNA TAG NFC
// ============================================================

router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, description, type, metadata } = req.body;

    const record = await NFC.findOne({ uid });
    if (!record) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (name) record.name = name;
    if (description) record.description = description;
    if (type) record.type = type;
    if (metadata) record.metadata = { ...record.metadata, ...metadata };
    record.updatedAt = new Date();

    await record.save();

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// LISTA TUTTI I TAG
// ============================================================

router.get('/list', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    
    let query = {};
    if (type) query.type = type;
    
    const records = await NFC.find(query)
      .sort({ lastSeen: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: records,
      count: records.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// STATISTICHE
// ============================================================

router.get('/stats', async (req, res) => {
  try {
    const total = await NFC.countDocuments();
    const byType = await NFC.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        byType,
        lastScanned: await NFC.findOne().sort({ lastSeen: -1 })
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
