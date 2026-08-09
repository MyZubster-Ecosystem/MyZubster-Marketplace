# 🤖 AgricoloBot Telegram Bot

Bot Telegram per il controllo remoto di **AgricoloBot**, il robot software per orti urbani.

**Bounty:** MyZubster Marketplace [#33](https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace/issues/33) — 200 MYZ

## 📋 Comandi

### Base
| Comando | Descrizione |
|---------|-------------|
| `/start` | Benvenuto e introduzione |
| `/help` | Lista completa comandi |
| `/about` | Info sul progetto |

### Controllo Robot
| Comando | Descrizione |
|---------|-------------|
| `/status` | Stato del robot (posizione, gripper, task) |
| `/water` | Avvia irrigazione |
| `/plant` | Avvia semina |
| `/analyze` | Analisi del suolo |
| `/harvest` | Avvia raccolta |

### Monitoraggio
| Comando | Descrizione |
|---------|-------------|
| `/sensors` | Lettura sensori (pH, EC, temp, umidità) |
| `/stats` | Statistiche giornaliere |
| `/health` | Stato salute del sistema |

### Pagamenti (MYZ)
| Comando | Descrizione |
|---------|-------------|
| `/balance` | Info wallet MYZ |
| `/pay` | Istruzioni pagamento |

## 🏗️ Architettura

```
📱 Telegram App
       ↓
🤖 Telegram Bot (node-telegram-bot-api)
       ↓
🦾 AgricoloBot API (http://localhost:5002/api/arm)
       ↓
🌱 Sensori Arduino (http://localhost:4000/api/sensors)
```

## 🚀 Installazione

### Prerequisiti
- Node.js >= 18
- Un bot Telegram creato con [@BotFather](https://t.me/BotFather)

### Setup
```bash
# Clona il repository
git clone https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace.git
cd MyZubster-Marketplace/telegram-bot

# Installa dipendenze
npm install

# Configura il token
cp .env.example .env
# Modifica .env con il tuo TELEGRAM_BOT_TOKEN

# Avvia il bot
npm start
```

### Configurazione `.env`
```env
TELEGRAM_BOT_TOKEN=il_tuo_token_da_BotFather
AGRICOLOBOT_API_URL=http://localhost:5002/api/arm
SENSORS_API_URL=http://localhost:4000/api/sensors
```

## 🧪 Test

Avvia il bot e testa i comandi su Telegram:

1. `/start` — Verifica il messaggio di benvenuto
2. `/help` — Verifica la lista comandi
3. `/sensors` — Verifica la lettura sensori (o messaggio offline)
4. `/health` — Verifica lo stato del sistema

Il bot gestisce graceful degradation: se le API non sono raggiungibili, mostra messaggi di errore chiari invece di crashare.

## 📁 Struttura

```
telegram-bot/
├── .env.example       # Template configurazione
├── package.json        # Dipendenze
├── bot.js              # Bot principale
└── README.md           # Questo file
```

## 🔗 Risorse

- [AgricoloBot](https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace/tree/main/robots/agricolo)
- [Robot Arm API](https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace/tree/main/robot-arm)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [MyZubster Network](https://api.myzubster.com)
