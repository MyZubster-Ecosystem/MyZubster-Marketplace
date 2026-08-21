require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// --- Configuration ---
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const AGRICOLO_API = process.env.AGRICOLOBOT_API_URL || 'http://localhost:5002/api/arm';
const SENSORS_API = process.env.SENSORS_API_URL || 'http://localhost:4000/api/sensors';
const MYZ_WALLET = process.env.MYZ_WALLET_ADDRESS || '0x153b65CCA4B2d69a9feD7be6E9C19c10736e8517';

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set. Copy .env.example to .env and fill in your token.');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// --- Helper: API calls with graceful fallback ---
async function agricoloAPI(endpoint, method = 'get', data = null) {
  try {
    const config = { timeout: 5000 };
    const res = method === 'post'
      ? await axios.post(`${AGRICOLO_API}${endpoint}`, data, config)
      : await axios.get(`${AGRICOLO_API}${endpoint}`, config);
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return { error: 'AgricoloBot API offline' };
    if (err.code === 'ETIMEDOUT') return { error: 'AgricoloBot API timeout' };
    return { error: err.message };
  }
}

async function sensorsAPI(endpoint) {
  try {
    const res = await axios.get(`${SENSORS_API}${endpoint}`, { timeout: 5000 });
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') return { error: 'Sensor API offline' };
    if (err.code === 'ETIMEDOUT') return { error: 'Sensor API timeout' };
    return { error: err.message };
  }
}

function formatSensors(data) {
  if (data.error) return `⚠️ Sensori non disponibili: ${data.error}`;
  const s = data.sensors || data;
  return [
    '📡 *Lettura Sensori*',
    `🌡️ Temperatura: ${s.temperature ?? 'N/D'}°C`,
    `💧 Umidità: ${s.humidity ?? 'N/D'}%`,
    `🧪 pH Suolo: ${s.ph ?? 'N/D'}`,
    `⚡ EC: ${s.ec ?? 'N/D'} mS/cm`,
    data.timestamp ? `🕐 ${new Date(data.timestamp).toLocaleString('it-IT')}` : '',
  ].filter(Boolean).join('\n');
}

// --- Basic Commands ---
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || 'Agricoltore';
  bot.sendMessage(msg.chat.id,
    `🌱 *Ciao ${name}!* Benvenuto su AgricoloBot Telegram!\n\n` +
    `Controlla il tuo orto urbano da remoto con semplici comandi.\n\n` +
    `Usa /help per vedere tutti i comandi disponibili.\n` +
    `Usa /about per saperne di più sul progetto.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🤖 *Comandi AgricoloBot*\n\n` +
    `📋 *Base*\n` +
    `/start — Benvenuto\n/help — Questa lista\n/about — Info progetto\n\n` +
    `🎮 *Controllo Robot*\n` +
    `/status — Stato del robot\n/water — Avvia irrigazione\n` +
    `/plant — Avvia semina\n/analyze — Analisi suolo\n/harvest — Avvia raccolta\n\n` +
    `📡 *Monitoraggio*\n` +
    `/sensors — Lettura sensori\n/stats — Statistiche giornaliere\n/health — Salute robot\n\n` +
    `💰 *Pagamenti (MYZ)*\n` +
    `/balance — Saldo wallet\n/pay — Info pagamento`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/about/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🌍 *AgricoloBot — Orti Urbani Intelligenti*\n\n` +
    `AgricoloBot è un robot software per la gestione automatizzata di orti urbani.\n\n` +
    `*Funzionalità principali:*\n` +
    `🌱 Irrigazione automatica\n🌾 Semina di precisione\n` +
    `🔬 Analisi del suolo in tempo reale\n🚜 Raccolta intelligente\n\n` +
    `*Stack:* Node.js + Telegram Bot API + Arduino Sensori\n` +
    `*Bounty:* MyZubster Marketplace #33\n` +
    `*Autore:* @laurentketterle-hub`,
    { parse_mode: 'Markdown' }
  );
});

// --- Robot Control Commands ---
bot.onText(/\/status/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await agricoloAPI('/status');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Errore: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `🦾 *Stato AgricoloBot*\n\n` +
    `📍 Posizione: ${data.position || 'N/D'}\n` +
    `✋ Gripper: ${data.gripper || 'N/D'}\n` +
    `📋 Task corrente: ${data.current_task || 'In attesa'}\n` +
    `🔋 Batteria: ${data.battery ?? 'N/D'}%\n` +
    `🔄 Stato: ${data.status || data.state || 'N/D'}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/water/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await agricoloAPI('/water', 'post');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Irrigazione fallita: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `💧 *Irrigazione avviata!*\n\n` +
    `Durata: ${data.duration || 'standard'}\n` +
    `Zone: ${data.zones || 'tutte'}\n` +
    `✅ Stato: ${data.status || 'completato'}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/plant/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await agricoloAPI('/plant', 'post');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Semina fallita: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `🌱 *Semina avviata!*\n\n` +
    `Tipo seme: ${data.seed_type || 'standard'}\n` +
    `Fila: ${data.row || 'auto'}\n` +
    `✅ Stato: ${data.status || 'in corso'}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/analyze/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await agricoloAPI('/analyze', 'post');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Analisi fallita: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `🔬 *Analisi del Suolo*\n\n` +
    `🧪 pH: ${data.ph ?? 'N/D'}\n` +
    `⚡ EC: ${data.ec ?? 'N/D'} mS/cm\n` +
    `🌿 Azoto (N): ${data.nitrogen ?? 'N/D'} mg/kg\n` +
    `🪨 Fosforo (P): ${data.phosphorus ?? 'N/D'} mg/kg\n` +
    `🧂 Potassio (K): ${data.potassium ?? 'N/D'} mg/kg\n` +
    `💧 Umidità: ${data.moisture ?? 'N/D'}%\n\n` +
    `📊 *Raccomandazione:* ${data.recommendation || 'Nessuna azione necessaria'}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/harvest/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await agricoloAPI('/harvest', 'post');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Raccolta fallita: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `🚜 *Raccolta avviata!*\n\n` +
    `🌿 Prodotto: ${data.crop || 'misto'}\n` +
    `📦 Quantità stimata: ${data.estimated_yield || 'N/D'}\n` +
    `✅ Stato: ${data.status || 'in corso'}`,
    { parse_mode: 'Markdown' }
  );
});

// --- Monitoring Commands ---
bot.onText(/\/sensors/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await sensorsAPI('/latest');
  bot.sendMessage(msg.chat.id, formatSensors(data), { parse_mode: 'Markdown' });
});

bot.onText(/\/stats/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const data = await sensorsAPI('/stats/daily');
  if (data.error) {
    return bot.sendMessage(msg.chat.id, `⚠️ Statistiche non disponibili: ${data.error}`);
  }
  bot.sendMessage(msg.chat.id,
    `📊 *Statistiche Giornaliere*\n\n` +
    `🌡️ Temp media: ${data.avg_temp ?? 'N/D'}°C (min: ${data.min_temp ?? '-'} / max: ${data.max_temp ?? '-'})\n` +
    `💧 Umidità media: ${data.avg_humidity ?? 'N/D'}%\n` +
    `🧪 pH medio: ${data.avg_ph ?? 'N/D'}\n` +
    `💦 Irrigazioni: ${data.waterings ?? 0}\n` +
    `⏱️ Ore funzionamento: ${data.operating_hours ?? 'N/D'}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/health/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const [robotData, sensorData] = await Promise.all([
    agricoloAPI('/health'),
    sensorsAPI('/health'),
  ]);
  const robotOK = !robotData.error;
  const sensorsOK = !sensorData.error;

  bot.sendMessage(msg.chat.id,
    `🏥 *Stato Salute*\n\n` +
    `🦾 Robot: ${robotOK ? '✅ Online' : '❌ Offline'}\n` +
    `   ${robotOK ? `Uptime: ${robotData.uptime || 'N/D'} | Errori: ${robotData.errors || 0}` : robotData.error}\n\n` +
    `📡 Sensori: ${sensorsOK ? '✅ Online' : '❌ Offline'}\n` +
    `   ${sensorsOK ? `Uptime: ${sensorData.uptime || 'N/D'} | Letture: ${sensorData.readings || 0}` : sensorData.error}\n\n` +
    `🤖 Bot Telegram: ✅ Operativo`,
    { parse_mode: 'Markdown' }
  );
});

// --- Payment Commands (optional) ---
bot.onText(/\/balance/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `💰 *Wallet MYZ*\n\n` +
    `Indirizzo: \`${MYZ_WALLET}\`\n` +
    `Rete: MyZubster (Chain ID 8888)\n` +
    `Token: MYZ\n\n` +
    `_Il saldo on-chain verrà integrato quando il RPC sarà attivo._`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/pay/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `💳 *Pagamento in MYZ*\n\n` +
    `Per pagare i servizi di AgricoloBot:\n` +
    `1. Invia MYZ a \`${MYZ_WALLET}\`\n` +
    `2. Inserisci nel memo il servizio richiesto:\n` +
    `   - \`water\` — Irrigazione\n` +
    `   - \`plant\` — Semina\n` +
    `   - \`analyze\` — Analisi suolo\n` +
    `   - \`harvest\` — Raccolta\n\n` +
    `_Costo: 5 MYZ per operazione_`,
    { parse_mode: 'Markdown' }
  );
});

// --- Startup ---
console.log('🤖 AgricoloBot Telegram Bot avviato!');
console.log(`   API Robot: ${AGRICOLO_API}`);
console.log(`   API Sensori: ${SENSORS_API}`);
console.log('   Premi Ctrl+C per fermare.');
