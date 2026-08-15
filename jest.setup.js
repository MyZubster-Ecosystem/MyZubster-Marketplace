// Imposta le variabili d'ambiente
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.MYZUBSTER_API_URL = 'http://localhost:3000/api';
process.env.MYZUBSTER_API_TOKEN = 'test_token';
process.env.WEBHOOK_SECRET = 'test_webhook_secret';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-groq-key';
process.env.DATABASE_URL = 'sqlite://:memory:';

const { sequelize } = require('./server');

let initialized = false;

beforeAll(async () => {
  if (!initialized) {
    console.log('🔧 Sincronizzazione database per i test...');
    await sequelize.sync({ force: true });
    console.log('✅ Database sincronizzato');
    initialized = true;
  }
});

afterAll(async () => {
  if (initialized) {
    console.log('🧹 Chiusura database...');
    await sequelize.close();
  }
});
