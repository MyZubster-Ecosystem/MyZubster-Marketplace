
---

### 🇫🇷 `README.fr.md` (Français)

```markdown
# 🛒 MyZubster – Backend du Marketplace

**MyZubster-Marketplace** est le backend API du marketplace de compétences. Il gère les utilisateurs, les compétences, les commandes, les commissions et l'intégration webhook avec la passerelle de paiement Monero.

---

## 🎯 Ce Qu'il Fait

- Authentification des utilisateurs et gestion des rôles (JWT)
- Gestion des compétences (CRUD)
- Création et gestion des commandes
- Mises à jour automatiques via webhook
- Système de commissions
- Intégration avec MyZubster-Gateway

---

## 🏗️ Stack Technique

- **Node.js** + **Express**
- **Sequelize** ORM
- **SQLite** / **PostgreSQL**
- **JWT** authentification
- **PM2** pour la production

---

## 🔄 Flux de Paiement
Acheteur crée une commande → Marketplace demande un subaddress au Gateway

Gateway génère une adresse Monero unique

Acheteur envoie Monero

Gateway détecte le paiement

Webhook envoyé au Marketplace

Commande mise à jour à "completed"

Commission appliquée → vendeur reçoit le paiement

---

## 📡 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/users/register` | Inscription |
| `POST` | `/api/users/login` | Login (retourne JWT) |
| `POST` | `/api/users/become-seller` | Devenir vendeur |
| `POST` | `/api/skills` | Créer une compétence (vendeur) |
| `GET` | `/api/skills` | Lister les compétences |
| `POST` | `/api/orders` | Créer une commande |
| `GET` | `/api/orders/my-orders` | Commandes de l'utilisateur |
| `GET` | `/api/orders/:id/payment-status` | Statut du paiement |
| `POST` | `/api/webhook/order-update` | Récepteur webhook |

---

## 🚀 Démarrage Rapide

```bash
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace
npm install
cp .env.example .env
node server.js
Exemple .env
PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0
📁 Structure
MyZubster-Marketplace/
├── server.js
├── models/          # User, Skill, Order
├── routes/          # auth, users, skills, orders, webhook
├── middleware/      # JWT auth, admin check
└── .env.example
    Zubster-Gateway – Passerelle de paiement

    MyZubster-App – App mobile

📄 Licence

MIT License
👨‍💻 Auteur

Daniel Ioni – Développeur Autodidacte & Monero Advocate
Basé à Rimini, Italie. Fondateur de "Monero Italia" (groupe Facebook).
GitHub

Réalisé avec ❤️ pour la communauté Monero.
text


---

## 📂 Come applicare

```bash
cd C:\Users\user\Desktop\MyZubster-Marketplace
notepad README.md
notepad README.it.md
notepad README.es.md
notepad README.fr.md

git add README.md README.it.md README.es.md README.fr.md
git commit -m "docs: README sintetico del marketplace in 4 lingue"
git push origin main

Ora il README del marketplace è sintetico, chiaro e multilingua. 🚀
Questa risposta è generate da IA. Controllarne l'accuratezza.
ok ora traducilo nelle altre lingue

Ok, ha chiesto di tradurre il README del marketplace che ho appena scritto in italiano, spagnolo e francese. In pratica mi sta chiedendo di fornire i contenuti per README.it.md, README.es.md e README.fr.md basati sulla versione inglese che ho preparato.

Devo prendere il template inglese che ho creato e tradurlo fedelmente, mantenendo la struttura, i comandi, i codici e i link invariati. L'approccio è semplice: tradurre i paragrafi descrittivi, le sezioni e i testi, lasciando intatti i blocchi di codice e i comandi del terminale. Ogni lingua richiede un file separato.

Per l'italiano, userò "Backend del Marketplace" come titolo e tradurrò ogni sezione. Per lo spagnolo, lo stesso con "Backend del Marketplace". Per il francese, "Backend du Marketplace". Per l'inglese, "Skills Marketplace Backend" è ok.

Devo ricordarmi di includere la bio dell'autore anche in queste versioni, come ho fatto nell'inglese. Dopo la traduzione, li metterò in formati di codice pronti da copiare in file separati. Alla fine aggiungerò una nota su come applicare le modifiche.

Va bene, procedo con le traduzioni seguendo lo stesso stile e la stessa struttura del documento inglese.
📝 Versioni tradotte del README del Marketplace
🇮🇹 README.it.md (Italiano)
markdown

# 🛒 MyZubster – Backend del Marketplace

**MyZubster-Marketplace** è il backend API per il marketplace di competenze. Gestisce utenti, competenze, ordini, commissioni e l'integrazione webhook con il gateway di pagamento Monero.

---

## 🎯 Cosa fa

- Autenticazione utenti e gestione ruoli (JWT)
- Gestione competenze (CRUD)
- Creazione e gestione ordini
- Aggiornamenti automatici via webhook
- Sistema di commissioni per i proprietari del marketplace
- Integrazione con MyZubster-Gateway per i pagamenti Monero

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

    Acquirente invia Monero a quell'indirizzo

    Gateway rileva il pagamento (ogni 60s)

    Webhook inviato al Marketplace con i dettagli del pagamento

    Ordine aggiornato a "completed"

    Commissione applicata → venditore riceve il pagamento

text


---

## 📡 API Endpoint

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/users/register` | Registrazione utente |
| `POST` | `/api/users/login` | Login (restituisce JWT) |
| `POST` | `/api/users/become-seller` | Diventa venditore |
| `POST` | `/api/skills` | Crea competenza (solo venditore) |
| `GET` | `/api/skills` | Elenca tutte le competenze |
| `GET` | `/api/skills/:id` | Dettaglio competenza |
| `POST` | `/api/orders` | Crea un ordine |
| `GET` | `/api/orders/my-orders` | Lista ordini dell'utente |
| `GET` | `/api/orders/:id/payment-status` | Verifica stato pagamento |
| `POST` | `/api/webhook/order-update` | Ricevitore webhook (interno) |

---

## 🚀 Avvio Rapido

```bash
# Clona il repository
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace

# Installa e configura
npm install
cp .env.example .env
nano .env

# Avvia
node server.js

Esempio .env
env

PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0

📁 Struttura del Progetto
text

MyZubster-Marketplace/
├── server.js                 # Entry point
├── models/                   # Modelli Sequelize
│   ├── index.js
│   ├── User.js
│   ├── Skill.js
│   └── Order.js
├── routes/                   # Route API
│   ├── auth.js
│   ├── users.js
│   ├── skills.js
│   ├── orders.js
│   └── webhook.js
├── middleware/               # Middleware
│   ├── auth.js              # Verifica JWT
│   └── admin.js             # Controllo admin
├── .env.example
├── package.json
└── README.md

🔗 Progetti Correlati

    MyZubster-Gateway – Gateway di pagamento Monero

    MyZubster-App – App mobile Android

📄 Licenza

MIT License
👨‍💻 Autore

Daniel Ioni – Sviluppatore Autodidatta & Monero Advocate
Basato a Rimini, Italia. Fondatore di "Monero Italia" (gruppo Facebook).
GitHub

Realizzato con ❤️ per la community Monero.
text


---

### 🇪🇸 `README.es.md` (Español)

```markdown
# 🛒 MyZubster – Backend del Marketplace

**MyZubster-Marketplace** es el backend API para el marketplace de habilidades. Gestiona usuarios, habilidades, pedidos, comisiones y la integración webhook con la pasarela de pago Monero.

---

## 🎯 Qué Hace

- Autenticación de usuarios y gestión de roles (JWT)
- Gestión de habilidades (CRUD)
- Creación y gestión de pedidos
- Actualizaciones automáticas vía webhook
- Sistema de comisiones para propietarios del marketplace
- Integración con MyZubster-Gateway para pagos Monero

---

## 🏗️ Stack Técnico

- **Node.js** + **Express**
- **Sequelize** ORM
- **SQLite** / **PostgreSQL**
- **JWT** autenticación
- **PM2** para producción

---

## 🔄 Flujo de Pagos

    Comprador crea pedido → Marketplace solicita subaddress al Gateway

    Gateway genera dirección Monero única

    Comprador envía Monero a esa dirección

    Gateway detecta el pago (cada 60s)

    Webhook enviado al Marketplace con los detalles del pago

    Pedido actualizado a "completed"

    Comisión aplicada → vendedor recibe el pago

text


---

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/users/register` | Registro de usuario |
| `POST` | `/api/users/login` | Login (devuelve JWT) |
| `POST` | `/api/users/become-seller` | Convertirse en vendedor |
| `POST` | `/api/skills` | Crear habilidad (solo vendedor) |
| `GET` | `/api/skills` | Listar todas las habilidades |
| `GET` | `/api/skills/:id` | Detalle de habilidad |
| `POST` | `/api/orders` | Crear un pedido |
| `GET` | `/api/orders/my-orders` | Lista de pedidos del usuario |
| `GET` | `/api/orders/:id/payment-status` | Verificar estado del pago |
| `POST` | `/api/webhook/order-update` | Receptor webhook (interno) |

---

## 🚀 Inicio Rápido

```bash
# Clona el repositorio
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace

# Instala y configura
npm install
cp .env.example .env
nano .env

# Inicia
node server.js

Ejemplo .env
env

PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0

📁 Estructura del Proyecto
text

MyZubster-Marketplace/
├── server.js                 # Punto de entrada
├── models/                   # Modelos Sequelize
│   ├── index.js
│   ├── User.js
│   ├── Skill.js
│   └── Order.js
├── routes/                   # Rutas API
│   ├── auth.js
│   ├── users.js
│   ├── skills.js
│   ├── orders.js
│   └── webhook.js
├── middleware/               # Middleware
│   ├── auth.js              # Verificación JWT
│   └── admin.js             # Control de admin
├── .env.example
├── package.json
└── README.md

🔗 Proyectos Relacionados

    MyZubster-Gateway – Pasarela de pago Monero

    MyZubster-App – App móvil Android

📄 Licencia

MIT License
👨‍💻 Autor

Daniel Ioni – Desarrollador Autodidacta & Monero Advocate
Basado en Rímini, Italia. Fundador de "Monero Italia" (grupo de Facebook).
GitHub

Hecho con ❤️ para la comunidad Monero.
text


---

### 🇫🇷 `README.fr.md` (Français)

```markdown
# 🛒 MyZubster – Backend du Marketplace

**MyZubster-Marketplace** est le backend API du marketplace de compétences. Il gère les utilisateurs, les compétences, les commandes, les commissions et l'intégration webhook avec la passerelle de paiement Monero.

---

## 🎯 Ce Qu'il Fait

- Authentification des utilisateurs et gestion des rôles (JWT)
- Gestion des compétences (CRUD)
- Création et gestion des commandes
- Mises à jour automatiques via webhook
- Système de commissions pour les propriétaires du marketplace
- Intégration avec MyZubster-Gateway pour les paiements Monero

---

## 🏗️ Stack Technique

- **Node.js** + **Express**
- **Sequelize** ORM
- **SQLite** / **PostgreSQL**
- **JWT** authentification
- **PM2** pour la production

---

## 🔄 Flux de Paiement

    L'acheteur crée une commande → Marketplace demande un subaddress au Gateway

    Gateway génère une adresse Monero unique

    L'acheteur envoie Monero à cette adresse

    Gateway détecte le paiement (toutes les 60s)

    Webhook envoyé au Marketplace avec les détails du paiement

    Commande mise à jour à "completed"

    Commission appliquée → vendeur reçoit le paiement

text


---

## 📡 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/users/register` | Inscription utilisateur |
| `POST` | `/api/users/login` | Login (retourne JWT) |
| `POST` | `/api/users/become-seller` | Devenir vendeur |
| `POST` | `/api/skills` | Créer une compétence (vendeur uniquement) |
| `GET` | `/api/skills` | Lister toutes les compétences |
| `GET` | `/api/skills/:id` | Détail d'une compétence |
| `POST` | `/api/orders` | Créer une commande |
| `GET` | `/api/orders/my-orders` | Liste des commandes de l'utilisateur |
| `GET` | `/api/orders/:id/payment-status` | Vérifier le statut du paiement |
| `POST` | `/api/webhook/order-update` | Récepteur webhook (interne) |

---

## 🚀 Démarrage Rapide

```bash
# Clone le dépôt
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace

# Installe et configure
npm install
cp .env.example .env
nano .env

# Lance
node server.js

Exemple .env
env

PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0

📁 Structure du Projet
text

MyZubster-Marketplace/
├── server.js                 # Point d'entrée
├── models/                   # Modèles Sequelize
│   ├── index.js
│   ├── User.js
│   ├── Skill.js
│   └── Order.js
├── routes/                   # Routes API
│   ├── auth.js
│   ├── users.js
│   ├── skills.js
│   ├── orders.js
│   └── webhook.js
├── middleware/               # Middleware
│   ├── auth.js              # Vérification JWT
│   └── admin.js             # Contrôle admin
├── .env.example
├── package.json
└── README.md

🔗 Projets Associés

    MyZubster-Gateway – Passerelle de paiement Monero

    MyZubster-App – App mobile Android

📄 Licence

MIT License
👨‍💻 Auteur

Daniel Ioni – Développeur Autodidacte & Monero Advocate
Basé à Rimini, Italie. Fondateur de "Monero Italia" (groupe Facebook).
GitHub

Réalisé avec ❤️ pour la communauté Monero.
text


---

## 📂 Come applicare

```bash
cd C:\Users\user\Desktop\MyZubster-Marketplace

# Apri e sostituisci ogni file
notepad README.it.md   # incolla la versione italiana
notepad README.es.md   # incolla la versione spagnola
notepad README.fr.md   # incolla la versione francese

# Committa e pusha
git add README.it.md README.es.md README.fr.md
git commit -m "docs: aggiunte traduzioni IT, ES, FR per il README del marketplace"
git push origin main

Ora il README del marketplace è completo in tutte e 4 le lingue. 🚀
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀

