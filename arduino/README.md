# EVA IONI - Arduino Soil Sensor Module

## Descrizione
Modulo per la lettura di sensori del suolo per orti urbani.
Parte del progetto MyZubster - Bounty #742.

## Sensori Supportati
- pH (sensore analogico)
- EC (Conducibilità Elettrica)
- Temperatura (DS18B20 o NTC)
- Umidità del suolo (resistivo o capacitivo)

## Collegamenti
| Sensore | Pin Arduino |
|---------|-------------|
| pH | A0 |
| EC | A1 |
| Temperatura | A2 |
| Umidità | A3 |

## Installazione
1. Carica soil_sensor.ino su Arduino
2. Installa le dipendenze Node.js:
   npm install serialport @serialport/parser-readline axios
3. Avvia il servizio:
   node arduino-service.js

## Test
Usa il simulatore per test senza hardware:
node test-simulator.js

## API Endpoint
- POST /api/sensors/data - Invia dati
- GET /api/sensors/garden/:id/latest - Ultima lettura
- GET /api/sensors/garden/:id/stats - Statistiche

## Bounty
- #742 - API Arduino pH/EC (0.08 XMR)
- #743 - Mappa Orti Urbani (0.06 XMR)
