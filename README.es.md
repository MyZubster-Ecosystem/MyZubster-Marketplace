
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
- Sistema de comisiones
- Integración con MyZubster-Gateway

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

Comprador envía Monero

Gateway detecta el pago

Webhook enviado al Marketplace

Pedido actualizado a "completed"

Comisión aplicada → vendedor recibe pago

---

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/users/register` | Registro |
| `POST` | `/api/users/login` | Login (devuelve JWT) |
| `POST` | `/api/users/become-seller` | Ser vendedor |
| `POST` | `/api/skills` | Crear habilidad (vendedor) |
| `GET` | `/api/skills` | Listar habilidades |
| `POST` | `/api/orders` | Crear pedido |
| `GET` | `/api/orders/my-orders` | Pedidos del usuario |
| `GET` | `/api/orders/:id/payment-status` | Estado del pago |
| `POST` | `/api/webhook/order-update` | Receptor webhook |

---

## 🚀 Inicio Rápido

```bash
git clone https://github.com/DanielIoni-creator/MyZubster-Marketplace.git
cd MyZubster-Marketplace
npm install
cp .env.example .env
node server.js
Ejemplo .env
PORT=4000
DATABASE_URL=sqlite:./database.sqlite
JWT_SECRET=your_jwt_secret
MYZUBSTER_API_URL=http://localhost:3000/api
MYZUBSTER_API_TOKEN=your_admin_token
WEBHOOK_SECRET=your_webhook_secret
COMMISSION_PERCENTAGE=2.0📁 Estructura
text

MyZubster-Marketplace/
├── server.js
├── models/          # User, Skill, Order
├── routes/          # auth, users, skills, orders, webhook
├── middleware/      # JWT auth, admin check
└── .env.example

🔗 Proyectos Relacionados

    MyZubster-Gateway – Pasarela de pagos

    MyZubster-App – App móvil
📄 Licencia

MIT License
👨‍💻 Autor

Daniel Ioni – Desarrollador Autodidacta & Monero Advocate
Basado en Rímini, Italia. Fundador de "Monero Italia" (grupo de Facebook).
GitHub

Hecho con ❤️ para la comunidad Monero.
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀
