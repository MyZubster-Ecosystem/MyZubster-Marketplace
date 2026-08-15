/*
 * EVA IONI - Arduino Service
 * Bounty #742 - MyZubster Marketplace
 * 
 * Questo servizio Node.js comunica con Arduino via Serial
 * e invia i dati al backend API.
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

class ArduinoService {
  constructor(port = '/dev/ttyUSB0', baudRate = 9600) {
    this.port = port;
    this.baudRate = baudRate;
    this.serialPort = null;
    this.parser = null;
    this.gardenId = process.env.GARDEN_ID || 'default-garden';
    this.apiUrl = process.env.API_URL || 'http://localhost:4000';
  }

  async connect() {
    try {
      console.log(`🔌 Connessione ad Arduino su ${this.port}...`);
      
      this.serialPort = new SerialPort({
        path: this.port,
        baudRate: this.baudRate,
        autoOpen: false
      });

      this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      return new Promise((resolve, reject) => {
        this.serialPort.open((err) => {
          if (err) {
            reject(`❌ Errore apertura porta: ${err.message}`);
            return;
          }
          console.log('✅ Connesso ad Arduino');
          resolve();
        });
      });
    } catch (error) {
      console.error('❌ Errore connessione:', error);
      throw error;
    }
  }

  startListening() {
    this.parser.on('data', async (data) => {
      try {
        // Prova a parsare il JSON
        const sensorData = JSON.parse(data);
        
        // Aggiungi gardenId se non presente
        if (!sensorData.gardenId) {
          sensorData.gardenId = this.gardenId;
        }

        // Invia i dati al backend
        await this.sendToBackend(sensorData);
        console.log('✅ Dati inviati:', sensorData);
      } catch (error) {
        // Se non è JSON, stampa come log
        if (data.trim()) {
          console.log('📟 Arduino:', data);
        }
      }
    });

    console.log('👂 In ascolto su Serial...');
  }

  async sendToBackend(sensorData) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/sensors/data`,
        sensorData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Errore invio al backend:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close();
      console.log('🔌 Disconnesso da Arduino');
    }
  }
}

// Esporta il servizio
module.exports = ArduinoService;

// Se eseguito direttamente
if (require.main === module) {
  const service = new ArduinoService();
  service.connect()
    .then(() => service.startListening())
    .catch(err => console.error('❌ Errore:', err));

  // Gestisci la chiusura
  process.on('SIGINT', async () => {
    await service.disconnect();
    process.exit();
  });
}
