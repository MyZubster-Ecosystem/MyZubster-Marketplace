module.exports = {
  serial: { port: process.env.SERIAL_PORT || '/dev/ttyUSB0', baudRate: 9600 },
  api: { baseUrl: 'https://myzubsterapp.onrender.com', sendIntervalMs: 300000 },
  garden: { id: 'rimini-park', name: 'Parco Biodiversita Rimini', lat: 44.0647, lng: 12.5877 },
  calibration: { ph: { offset: 0, slope: 1 }, ec: { offset: 0, slope: 1 } }
};
