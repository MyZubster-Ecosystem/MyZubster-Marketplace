# MyZubster Urban Gardens - User Manual (#24)

## Introduction

MyZubster Urban Gardens is a decentralized platform that connects urban gardeners, robots, and communities. This manual covers how to use MyZubster for urban garden management, product sales, seed exchange, and monitoring.

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Registering Your Garden](#2-registering-your-garden)
3. [Listing Garden Products](#3-listing-garden-products)
4. [Seed and Cutting Exchange](#4-seed-and-cutting-exchange)
5. [Monitoring Garden Stats](#5-monitoring-garden-stats)
6. [Public Dashboard](#6-public-dashboard)
7. [Payments (MYZ/XMR)](#7-payments-myzxmr)
8. [Troubleshooting](#8-troubleshooting)

## 1. Getting Started

### Prerequisites
- A MyZubster account (register at https://myzubsterapp.onrender.com)
- A Monero (XMR) or MYZ wallet
- Optional: IoT sensors (ESP32 + temperature/humidity/pH sensors)

### Registration
```bash
curl -X POST https://myzubsterapp.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"gardener1","password":"securepass","email":"gardener@example.com"}'
```

### Login
```bash
curl -X POST https://myzubsterapp.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"gardener1","password":"securepass"}'
```
Save the returned JWT token for API calls.

## 2. Registering Your Garden

Register your urban garden to make it visible on the platform:

```bash
curl -X POST https://myzubsterapp.onrender.com/api/urban-garden \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Community Garden",
    "ownerId": "gardener1",
    "category": "community_garden",
    "lat": 44.0647,
    "lng": 12.5877,
    "address": "Via Roma 1, Rimini",
    "size": "medium"
  }'
```

### Garden Categories
- `fruit_tree` - Fruit trees (apple, pear, citrus)
- `vegetable_garden` - Vegetable plots
- `herb_garden` - Herbs and spices
- `community_garden` - Shared community gardens
- `rooftop_garden` - Urban rooftop gardens

## 3. Listing Garden Products

Sell garden products on the marketplace:

```bash
curl -X POST https://myzubsterapp.onrender.com/api/marketplace/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Tomato Seedlings",
    "description": "San Marzano variety, 6 weeks old",
    "category": "seedlings",
    "price": 5,
    "currency": "MYZ",
    "sellerId": "gardener1",
    "stock": 20,
    "lat": 44.0647,
    "lng": 12.5877
  }'
```

### Product Categories
- `seeds` - Packaged seeds
- `seedlings` - Young plants
- `tools` - Garden tools
- `soil` - Soil and compost
- `fertilizer` - Organic fertilizers
- `pots` - Pots and containers
- `other` - Other garden items

## 4. Seed and Cutting Exchange

Exchange seeds and cuttings with other gardeners (no payment required):

### Offer Seeds
```bash
curl -X POST https://myzubsterapp.onrender.com/api/marketplace/exchanges \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offerType": "offer",
    "userId": "gardener1",
    "seedName": "Basil Genovese",
    "seedType": "seed",
    "quantity": 50,
    "description": "Organic basil seeds, harvested 2026"
  }'
```

### Request Seeds
```bash
curl -X POST https://myzubsterapp.onrender.com/api/marketplace/exchanges \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offerType": "request",
    "userId": "gardener1",
    "seedName": "Cherry Tomato",
    "seedType": "seedling",
    "quantity": 5,
    "description": "Looking for cherry tomato seedlings"
  }'
```

### Match an Exchange
```bash
curl -X POST https://myzubsterapp.onrender.com/api/marketplace/exchanges/EXCHANGE_ID/match \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "gardener2"}'
```

### Complete an Exchange
```bash
curl -X POST https://myzubsterapp.onrender.com/api/marketplace/exchanges/EXCHANGE_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Seed Types
- `seed` - Packaged seeds
- `cutting` - Plant cuttings
- `seedling` - Young plants
- `bulb` - Flower bulbs
- `tuber` - Potato/tuber crops

## 5. Monitoring Garden Stats

Update your garden's sensor data for monitoring:

```bash
curl -X PUT https://myzubsterapp.onrender.com/api/marketplace/dashboard/GARDEN_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gardenName": "My Community garden",
    "plants": {"total": 15, "varieties": 8},
    "sensors": {"temperature": 22.5, "humidity": 65, "ph": 6.8, "soilMoisture": 45}
  }'
```

### Using IoT Sensors (ESP32)
Connect an ESP32 with sensors to automatically update garden stats:

```cpp
#include <MyZubsterRobot.h>
MyZubsterRobot robot;

void setup() {
  Serial.begin(115200);
  robot.begin();
  robot.connectWiFi("SSID", "PASSWORD");
  robot.connectGateway("https://myzubsterapp.onrender.com");
}

void loop() {
  float temp = robot.readTemperature();
  float humidity = robot.readHumidity();
  float pH = robot.readPH();
  robot.sendSensorData(temp, humidity, pH);
  delay(300000); // 5 minutes
}
```

## 6. Public Dashboard

View all public gardens on the dashboard:

```bash
curl https://myzubsterapp.onrender.com/api/marketplace/dashboard
```

### Filter by Location
```bash
curl "https://myzubsterapp.onrender.com/api/marketplace/dashboard?lat=44.0647&lng=12.5877&maxDist=0.5"
```

The dashboard returns:
- Total number of public gardens
- Total plants and varieties
- Average temperature and humidity
- Individual garden details with sensor data

## 7. Payments (MYZ/XMR)

### Buying Products
When you buy a garden product, payment is processed automatically:
```bash
curl -X POST https://myzubsterapp.onrender.com/api/dashboard/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "buyer1",
    "orderId": "order-001",
    "amount": 5,
    "currency": "MYZ",
    "paymentMethod": "MYZ"
  }'
```

### Checking Balance
```bash
curl https://myzubsterapp.onrender.com/api/dashboard/user/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Earning MYZ
- **Bounties**: Complete development tasks on GitHub
- **Robot jobs**: Robots complete garden maintenance jobs
- **Referrals**: Invite new users and earn 5 MYZ each
- **QA rewards**: Report bugs and earn 5-50 MYZ
- **Governance**: Vote on proposals and earn 2 MYZ per vote

## 8. Troubleshooting

### "Authentication failed"
- Ensure your JWT token is valid (expires in 24h)
- Use `Authorization: Bearer YOUR_TOKEN` header

### "Insufficient balance"
- Check your MYZ/XMR balance via the dashboard API
- Earn MYZ through bounties or robot jobs

### "Garden not found"
- Ensure you've registered your garden first
- Check the gardenId is correct

### "Cannot match own exchange"
- You cannot match an exchange you created
- Ask another user to match it

### "Exchange is not open"
- Exchanges go through: open -> matched -> completed
- Only 'open' exchanges can be matched
- Only 'matched' exchanges can be completed

## Support

- GitHub Issues: https://github.com/MyZubster-Ecosystem
- Telegram: @Myzubster_bot
- Documentation: https://github.com/MyZubster-Ecosystem/myzubster-docs

## License

MIT
