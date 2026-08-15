// routes/pgp.js
const express = require('express');
const router = express.Router();
const { signMessage, verifySignature, encryptMessage } = require('../services/pgpService');
const auth = require('../middleware/auth');

// =============================================
// 1. FIRMA UN MESSAGGIO (richiede autenticazione)
// =============================================
// POST /api/pgp/sign
// Body: { message: "testo da firmare" }
router.post('/sign', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Messaggio richiesto' });
    }

    const signature = await signMessage(message);

    res.json({
      success: true,
      signature,
      message: 'Messaggio firmato con successo'
    });

  } catch (error) {
    console.error('❌ Errore firma PGP:', error.message);
    res.status(500).json({
      error: 'Errore firma',
      details: error.message
    });
  }
});

// =============================================
// 2. VERIFICA UNA FIRMA (pubblico)
// =============================================
// POST /api/pgp/verify
// Body: { message, signature, publicKey }
router.post('/verify', async (req, res) => {
  try {
    const { message, signature, publicKey } = req.body;

    if (!message || !signature || !publicKey) {
      return res.status(400).json({
        error: 'Campi mancanti: message, signature, publicKey'
      });
    }

    const isValid = await verifySignature(message, signature, publicKey);

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? '✅ Firma valida' : '❌ Firma non valida'
    });

  } catch (error) {
    console.error('❌ Errore verifica PGP:', error.message);
    res.status(500).json({
      error: 'Errore verifica',
      details: error.message
    });
  }
});

// =============================================
// 3. CIFRA UN MESSAGGIO (richiede autenticazione)
// =============================================
// POST /api/pgp/encrypt
// Body: { message, recipientKey }
router.post('/encrypt', auth, async (req, res) => {
  try {
    const { message, recipientKey } = req.body;

    if (!message || !recipientKey) {
      return res.status(400).json({
        error: 'Campi mancanti: message, recipientKey'
      });
    }

    const encrypted = await encryptMessage(message, recipientKey);

    res.json({
      success: true,
      encrypted,
      message: 'Messaggio cifrato con successo'
    });

  } catch (error) {
    console.error('❌ Errore cifratura PGP:', error.message);
    res.status(500).json({
      error: 'Errore cifratura',
      details: error.message
    });
  }
});

// =============================================
// 4. OTTIENI LA CHIAVE PUBBLICA DEL MARKETPLACE
// =============================================
// GET /api/pgp/public-key
router.get('/public-key', (req, res) => {
  try {
    const publicKey = process.env.PGP_PUBLIC_KEY;

    if (!publicKey) {
      return res.status(404).json({
        error: 'Chiave pubblica non configurata'
      });
    }

    res.json({
      success: true,
      publicKey,
      keyId: process.env.PGP_KEY_ID || 'unknown'
    });

  } catch (error) {
    console.error('❌ Errore recupero chiave pubblica:', error.message);
    res.status(500).json({
      error: 'Errore recupero chiave pubblica'
    });
  }
});

// =============================================
// 5. HEALTH CHECK PGP (verifica che GPG sia installato)
// =============================================
// GET /api/pgp/health
router.get('/health', async (req, res) => {
  try {
    const { exec } = require('child_process');
    exec('gpg --version', (error, stdout) => {
      if (error) {
        return res.status(500).json({
          status: 'error',
          message: 'GPG non installato o non disponibile'
        });
      }
      res.json({
        status: 'ok',
        gpg: stdout.split('\n')[0],
        pgpKeyId: process.env.PGP_KEY_ID || 'non configurato'
      });
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;