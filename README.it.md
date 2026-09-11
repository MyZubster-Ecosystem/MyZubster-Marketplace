
---

### 🇮🇹 `README.it.md` (Italiano)

```markdown
# 🛒 MyZubster – Backend del Marketplace

**MyZubster-Marketplace** è il backend API per il marketplace di competenze. Gestisce utenti, competenze, ordini, commissioni e l'integrazione webhook con il gateway di pagamento Monero.

---

## 🎯 Cosa fa

- Autenticazione utenti e gestione ruoli (JWT)
- Gestione competenze (CRUD)
- Creazione e gestione ordini
- Aggiornamenti automatici via webhook
- Sistema di commissioni
- Integrazione con MyZubster-Gateway

---

## 🏗️ Stack Tecnico

- **Node.js** + **Express**
- **Sequelize** ORM
- **SQLite** / **PostgreSQL**
- **JWT** autenticazione
- **PM2** per produzione

---

## 🔄 Flusso Pagamenti
Acquirente crea ordine → Marketplace richiede subaddress al Gateway

Gateway genera indirizzo Monero unico

Acquirente invia Monero

Gateway rileva pagamento

Webhook inviato al Marketplace

Ordine aggiornato a "completed"

Commissione applicata → venditore riceve pagamento

---

## 📡 API Endpoint

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/users/register` | Registrazione |
| `POST` | `/api/users/login` | Login (restituisce JWT) |
| `POST` | `/api/users/become-seller` | Diventa venditore |
| `POST` | `/api/skills` | Crea competenza (venditore) |
| `GET` | `/api/skills` | Elenca competenze |
| `POST` | `/api/orders` | Crea ordine |
| `GET` | `/api/orders/my-orders` | Ordini utente |
| `GET` | `/api/orders/:id/payment-status` | Stato pagamento |
| `POST` | `/api/webhook/order-update` | Ricevitore webhook |

---

## 🚀 Avvio Rapido

```bash
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace
npm install
cp .env.example .env
Esempio .env
env

PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0
MyZubster-Marketplace/
├── server.js
├── models/          # User, Skill, Order
├── routes/          # auth, users, skills, orders, webhook
├── middleware/      # JWT auth, admin check
└── .env.example
🔗 Progetti Correlati

    MyZubster-Gateway – Gateway pagamenti

    MyZubster-App – App mobile

📄 Licenza

MIT License
👨‍💻 Autore

Daniel Ioni – Sviluppatore Autodidatta & Monero Advocate
Basato a Rimini, Italia. Fondatore di "Monero Italia" (gruppo Facebook).
GitHub
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀


Realizzato con ❤️ per la community Monero.