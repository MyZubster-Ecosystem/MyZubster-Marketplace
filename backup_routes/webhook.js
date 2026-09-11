// routes/webhook.js
const express = require('express');
const { Order } = require('../models');
const router = express.Router();

// Webhook per ricevere notifiche dal core gateway
router.post('/order-update', async (req, res) => {
  try {
    console.log('📨 Webhook ricevuto:', req.body);

    const { orderId, status, txHash, confirmations, amountReceived } = req.body;

    // Validazione
    if (!orderId) {
      console.error('❌ orderId mancante');
      return res.status(400).json({ error: 'orderId è obbligatorio' });
    }

    if (!status) {
      console.error('❌ status mancante');
      return res.status(400).json({ error: 'status è obbligatorio' });
    }

    console.log(`🔍 Cerco ordine con ID: ${orderId}`);

    // Cerca l'ordine
    const order = await Order.findByPk(orderId);
    if (!order) {
      console.error(`❌ Ordine ${orderId} non trovato`);
      return res.status(404).json({ error: 'Ordine non trovato' });
    }

    console.log(`🔍 Ordine trovato:`, order.toJSON());

    // Aggiorna l'ordine
    order.status = status;
    if (txHash) order.txHash = txHash;
    if (confirmations !== undefined) order.confirmations = confirmations;
    if (amountReceived !== undefined) order.amountReceived = amountReceived;
    await order.save();

    console.log(`✅ Ordine ${orderId} aggiornato a ${status}`);

    res.json({
      success: true,
      message: `Ordine ${orderId} aggiornato a ${status}`,
      order: {
        id: order.id,
        status: order.status,
        confirmations: order.confirmations,
        amountReceived: order.amountReceived
      }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;