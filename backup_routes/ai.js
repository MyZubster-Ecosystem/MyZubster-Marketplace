const express = require('express');
const router = express.Router();
const { generateSkillDescription } = require('../services/aiService');
const auth = require('../middleware/auth');

router.post('/generate-skill', auth, async (req, res) => {
  try {
    const { title, category } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category required' });
    }

    const result = await generateSkillDescription(title, category);
    res.json(result);
  } catch (error) {
    console.error('❌ AI route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
