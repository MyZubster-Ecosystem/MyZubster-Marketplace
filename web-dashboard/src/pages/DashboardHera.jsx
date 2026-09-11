import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Registra Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// Icona personalizzata
const gardenIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DashboardHera() {
  const [sensorData, setSensorData] = useState(null);
  const [exchangeListings, setExchangeListings] = useState([]);
  const [gardens, setGardens] = useState([]);
  const [robotStats, setRobotStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Dati delle talee
  const cuttings = [
    { name: 'Rosmarino', price: 0.0005, type: 'cutting', available: true },
    { name: 'Basilico Genovese', price: 0.0005, type: 'cutting', available: true },
    { name: 'Pomodoro Cuore di Bue', price: 0.001, type: 'seed', available: true },
    { name: 'Menta', price: 0.0005, type: 'cutting', available: true },
    { name: 'Salvia', price: 0.0005, type: 'cutting', available: true }
  ];

  // Fetch dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sensorRes, exchangeRes, gardensRes, robotRes] = await Promise.all([
          fetch('https://myzubster.com/api/sensors/latest'),
          fetch('https://myzubster.com/api/exchange'),
          fetch('https://myzubster.com/api/gardens'),
          fetch('https://myzubster.com/api/self-replicating-robot/stats')
        ]);
        
        const sensorJson = await sensorRes.json();
        const exchangeJson = await exchangeRes.json();
        const gardensJson = await gardensRes.json();
        const robotJson = await robotRes.json();
        
        setSensorData(sensorJson.data);
        setExchangeListings(exchangeJson.data || []);
        setGardens(gardensJson.data || []);
        setRobotStats(robotJson.data);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (err) {
        console.error('Errore fetch:', err);
        setError('Impossibile caricare i dati.');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">🌱 Dashboard Hera</h1>
              <p className="text-green-100">Orto Urbano IONI - Rimini</p>
            </div>
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-500 rounded-full text-sm">🟢 Live</span>
              <span className="text-sm">
                Aggiornato: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* STATISTICHE RAPIDE */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">🌱 Orti</p>
            <p className="text-2xl font-bold text-green-700">{gardens.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">🤖 Robot</p>
            <p className="text-2xl font-bold text-blue-700">{robotStats?.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm">🌿 Talee</p>
            <p className="text-2xl font-bold text-orange-700">{exchangeListings.length || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">📡 Letture</p>
            <p className="text-2xl font-bold text-purple-700">145</p>
          </div>
        </section>

        {/* MAPPA */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">🗺️ Mappa Orti Urbani</h2>
          </div>
          <div className="h-[400px]">
            <MapContainer 
              center={[44.0678, 12.5695]} 
              zoom={13} 
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {gardens.map((garden) => (
                <Marker 
                  key={garden._id}
                  position={garden.location?.coordinates ? [garden.location.coordinates[1], garden.location.coordinates[0]] : [44.0678, 12.5695]} 
                  icon={gardenIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">🌱 {garden.name}</h3>
                      <p className="text-sm">{garden.address || 'Rimini'}</p>
                      <p className="text-sm text-green-600">🟢 Attivo</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* SCAMBIO TALEE */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🌿 Scambio Talee</h2>
            <span className="text-sm text-gray-500">Pagamenti in XMR</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cuttings.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {item.available ? '✅ Disponibile' : '❌ Esaurito'}
                  </span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-orange-600">{item.price} XMR</span>
                  <button 
                    className={`px-3 py-1 text-sm rounded ${item.available ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    disabled={!item.available}
                  >
                    Scambia
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mt-8 pt-6 border-t text-center text-gray-500 text-sm">
          <p>🚀 <strong>EVA IONI</strong> — Il primo robot open-source per orti urbani</p>
          <p className="mt-2">
            🔗 <a href="https://github.com/MyZubster-Ecosystem" className="text-green-600 hover:underline" target="_blank">GitHub</a> •
            🐦 <a href="https://twitter.com/myzubster" className="text-green-600 hover:underline" target="_blank">@myzubster</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
