# MyZubster Marketplace - EVA IONI Integration

## Panoramica
API per la gestione degli orti urbani e dei sensori Arduino.

## Moduli Completati

### 1. Mappa Orti Urbani (Bounty #743)
- Mappa interattiva con Leaflet.js
- Geolocalizzazione endpoint /nearby
- CRUD completo per orti

### 2. API Arduino pH/EC (Bounty #742)
- Ricezione dati da sensori
- Statistiche in tempo reale
- Simulatore Arduino per test

## API Endpoint

### Gardens
GET    /api/gardens              - Lista tutti gli orti
GET    /api/gardens/:id          - Dettaglio orto
GET    /api/gardens/nearby       - Orti vicini
POST   /api/gardens              - Crea nuovo orto
PUT    /api/gardens/:id          - Aggiorna orto
DELETE /api/gardens/:id          - Elimina orto

### Sensors
POST   /api/sensors/data         - Invia dati sensore
GET    /api/sensors/garden/:id   - Storico dati
GET    /api/sensors/garden/:id/latest - Ultima lettura
GET    /api/sensors/garden/:id/stats - Statistiche

## Bounty Completate
| # | Descrizione | Guadagno | Stato |
|---|-------------|----------|-------|
| 742 | API Arduino pH/EC | 0.08 XMR | ✅ |
| 743 | Mappa Orti Urbani | 0.06 XMR | ✅ |
