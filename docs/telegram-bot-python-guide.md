# Telegram Bot per AgricoloBot - Guida Python

## Architettura Proposta

📱 Telegram App
       ↓
🐍 Python Bot (python-telegram-bot)
       ↓
🦾 AgricoloBot API (http://localhost:5002/api/arm)
       ↓
🌱 Sensori Arduino (http://localhost:4000/api/sensors)

## Installazione

bash
git clone https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace.git
cd MyZubster-Marketplace
mkdir -p telegram-bot-python/src
cd telegram-bot-python
python3 -m venv venv
source venv/bin/activate
pip install python-telegram-bot requests python-dotenv

## Struttura dei File

telegram-bot-python/
├── bot.py
├── config.py
├── handlers/
│   ├── __init__.py
│   ├── start.py
│   ├── help.py
│   ├── status.py
│   ├── water.py
│   ├── plant.py
│   ├── analyze.py
│   └── sensors.py
├── utils/
│   ├── __init__.py
│   └── api_client.py
├── .env.example
└── README.md

## Esempio di Implementazione

bot.py

import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TOKEN = os.getenv('TELEGRAM_TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🌱 Benvenuto in AgricoloBot!\n\n"
        "📋 COMANDI:\n"
        "/help - Lista comandi\n"
        "/status - Stato robot\n"
        "/water - Irrigazione\n"
        "/plant - Semina\n"
        "/analyze - Analisi suolo\n"
        "/sensors - Dati sensori"
    )

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()

## Configurazione

.env.example

TELEGRAM_TOKEN=il_tuo_token_qui
ROBOT_API=http://localhost:5002/api/arm
MARKETPLACE_API=http://localhost:4000/api

## Ricompensa
- 200 MYZ + 1% lifetime
- Bounty: #33
