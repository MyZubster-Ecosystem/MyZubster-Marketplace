const express = require('express');
const router = express.Router();

router.post('/order-update', async (req, res) => {
  try {
    const { Order, WebhookLog } = req.models;
    const { orderId, status, event, payload } = req.body;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Ordine non trovato' });
    }

    if (status) {
      await order.update({ status });
    }

    await WebhookLog.create({
      order_id: orderId,
      event: event || 'order-update',
      payload: JSON.stringify(payload || req.body),
      status: 'received'
    });

    res.json({ message: 'Webhook ricevuto', order });
  } catch (error) {
    console.error('❌ Errore webhook:', error.message);
    res.status(500).json({ error: 'Errore webhook' });
  }
});

module.exports = router;
