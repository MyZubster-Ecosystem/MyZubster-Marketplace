const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const generateSkillDescription = async (title, category) => {
  try {
    const prompt = `Generate a professional service description for a freelance marketplace.

Title: "${title}"
Category: "${category}"

Requirements:
1. Write a compelling, professional description (150-200 words)
2. Include key skills and benefits
3. Suggest a fair price range in USD
4. Add relevant tags for discoverability

Format your response as JSON:
{
  "description": "...",
  "suggestedPrice": 50-200,
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a professional copywriter for a freelance marketplace.' },
        { role: 'user', content: prompt }
      ],
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('❌ AI Service error:', error);
    throw error;
  }
};

module.exports = { generateSkillDescription };
