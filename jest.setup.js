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
