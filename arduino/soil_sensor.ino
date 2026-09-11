/*
 * EVA IONI - Soil Sensor for Urban Gardens
 * Bounty #742 - MyZubster Marketplace
 * 
 * Questo codice legge i dati da sensori:
 * - pH (sensore analogico)
 * - EC (Conducibilità Elettrica)
 * - Temperatura (DS18B20 o NTC)
 * - Umidità del suolo (resistivo o capacitivo)
 * 
 * I dati vengono inviati via Serial al Node.js backend
 */

#include <Arduino.h>

// Pin definitions
#define PH_PIN A0
#define EC_PIN A1
#define TEMP_PIN A2
#define SOIL_MOISTURE_PIN A3

// Variabili per i sensori
float phValue = 0.0;
float ecValue = 0.0;
float temperature = 0.0;
float soilMoisture = 0.0;

// Timing
unsigned long lastRead = 0;
const unsigned long READ_INTERVAL = 5000; // 5 secondi

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Attendi la connessione seriale
  }
  
  Serial.println("EVA IONI - Soil Sensor v1.0");
  Serial.println("Ready to read sensor data...");
}

void loop() {
  if (millis() - lastRead >= READ_INTERVAL) {
    lastRead = millis();
    
    // Leggi i sensori
    readSensors();
    
    // Invia i dati in formato JSON via Serial
    sendData();
  }
}

void readSensors() {
  // Leggi i valori analogici
  int phRaw = analogRead(PH_PIN);
  int ecRaw = analogRead(EC_PIN);
  int tempRaw = analogRead(TEMP_PIN);
  int moistureRaw = analogRead(SOIL_MOISTURE_PIN);
  
  // Converti in valori reali
  phValue = map(phRaw, 0, 1023, 0, 140) / 10.0; // pH 0-14
  ecValue = map(ecRaw, 0, 1023, 0, 500) / 100.0; // EC 0-5.0 mS/cm
  temperature = map(tempRaw, 0, 1023, -10, 50); // Temperatura -10°C a 50°C
  soilMoisture = map(moistureRaw, 0, 1023, 0, 100); // Umidità 0-100%
}

void sendData() {
  // Crea un oggetto JSON
  String json = "{";
  json += "\"gardenId\":\"\","; // Sarà riempito dal backend
  json += "\"ph\":" + String(phValue) + ",";
  json += "\"ec\":" + String(ecValue) + ",";
  json += "\"temperature\":" + String(temperature) + ",";
  json += "\"humidity\":" + String(soilMoisture);
  json += "}";
  
  Serial.println(json);
}
