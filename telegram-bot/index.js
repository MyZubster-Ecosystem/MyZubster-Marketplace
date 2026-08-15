/**
 * AgricoloBot - Telegram Bot
 * Controllo remoto degli orti urbani
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ROBOT_API = process.env.ROBOT_API || 'http://localhost:5002/api/arm';
const MARKETPLACE_API = process.env.MARKETPLACE_API || 'http://localhost:4000/api';

if (!TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN mancante! Crea un file .env con il token');
  console.log('📌 Per ottenere un token:');
  console.log('   1. Apri Telegram e cerca @BotFather');
  console.log('   2. Invia /newbot e segui le istruzioni');
  console.log('   3. Copia il token ricevuto');
  console.log('   4. Inseriscilo nel file .env');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ============================================================
// COMANDI
// ============================================================

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
🌱 Benvenuto in AgricoloBot!

🤖 Sono il tuo assistente per gli orti urbani.

📋 COMANDI:
/help - Lista comandi
/status - Stato robot
/water - Irrigazione
/plant - Semina
/analyze - Analisi suolo
/sensors - Dati sensori
/donate - Supporta il progetto
  `);
});

// /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📋 COMANDI DISPONIBILI:

🤖 STATO:
/status - Stato del robot

🚜 TASK:
/water - Irrigazione
/plant - Semina
/analyze - Analisi suolo

📡 SENSORI:
/sensors - Dati sensori

ℹ️ ALTRO:
/help - Questo messaggio
/donate - Supporta il progetto
  `);
});

// /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.get(`${ROBOT_API}/health`);
    const data = res.data;
    bot.sendMessage(chatId, `
🦾 STATO ROBOT

📌 Posizione: (${data.state?.position?.x || 0}, ${data.state?.position?.y || 0}, ${data.state?.position?.z || 0})
🤖 Gripper: ${data.state?.gripper || 'N/A'}
⚙️ Stato: ${data.state?.status || 'idle'}
⏱️ ${new Date(data.timestamp).toLocaleString()}
    `);
  } catch (error) {
    bot.sendMessage(chatId, '❌ Errore: Robot non raggiungibile');
  }
});

// /water
bot.onText(/\/water/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await axios.post(`${ROBOT_API}/task`, { task: 'water' });
    bot.sendMessage(chatId, '💧 Irrigazione avviata!');
  } catch (error) {
    bot.sendMessage(chatId, '❌ Errore: Impossibile avviare');
  }
});

// /plant
bot.onText(/\/plant/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await axios.post(`${ROBOT_API}/task`, { task: 'plant' });
    bot.sendMessage(chatId, '🌱 Semina avviata!');
  } catch (error) {
    bot.sendMessage(chatId, '❌ Errore: Impossibile avviare');
  }
});

// /analyze
bot.onText(/\/analyze/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await axios.post(`${ROBOT_API}/task`, { task: 'analyze' });
    bot.sendMessage(chatId, '🔬 Analisi del suolo in corso...');
  } catch (error) {
    bot.sendMessage(chatId, '❌ Errore: Impossibile analizzare');
  }
});

// /sensors
bot.onText(/\/sensors/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    const res = await axios.get(`${ROBOT_API}/sensors`);
    const data = res.data.data;
    bot.sendMessage(chatId, `
📡 DATI SENSORI

🌱 pH: ${data.ph?.toFixed(2) || 'N/A'}
⚡ EC: ${data.ec?.toFixed(2) || 'N/A'} mS/cm
🌡️ Temperatura: ${data.temperature?.toFixed(1) || 'N/A'}°C
💧 Umidità: ${data.humidity?.toFixed(1) || 'N/A'}%
⏱️ ${new Date(data.timestamp).toLocaleString()}
    `);
  } catch (error) {
    bot.sendMessage(chatId, '❌ Errore: Impossibile leggere sensori');
  }
});

// /donate
bot.onText(/\/donate/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
💖 SUPPORTA AGRICOLOBOT

💰 DONAZIONI:
• XMR: 83vZt8bKc5qXyHZKwj2Qq3Yp
• MYZ: In arrivo!

Grazie per il supporto! 🌱
  `);
});

console.log('🤖 AgricoloBot Telegram avviato!');
console.log('📡 In attesa di comandi...');
console.log('✅ Per testare, invia /start al bot su Telegram');
