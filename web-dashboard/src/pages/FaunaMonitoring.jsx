import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function FaunaMonitoring() {
  const [faunaData, setFaunaData] = useState(null);
  const [species, setSpecies] = useState([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGarden, setSelectedGarden] = useState('6a75516a84c3bdd34c108e1f');

  useEffect(() => {
    fetchFaunaData();
  }, []);

  const fetchFaunaData = async () => {
    try {
      const [statsRes, speciesRes, obsRes] = await Promise.all([
        fetch('https://myzubster.com/api/fauna/stats'),
        fetch('https://myzubster.com/api/fauna/species'),
        fetch(`https://myzubster.com/api/fauna/garden/${selectedGarden}`)
      ]);

      const stats = await statsRes.json();
      const speciesData = await speciesRes.json();
      const obsData = await obsRes.json();

      setFaunaData(stats.data || []);
      setSpecies(speciesData.data || []);
      setObservations(obsData.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Errore:', err);
      setError('Impossibile caricare i dati della fauna');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dati fauna...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl">⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Preparazione dati per grafici
  const pollinatorData = {
    labels: species.slice(0, 5).map(s => s._id),
    datasets: [{
      label: 'Popolazione',
      data: species.slice(0, 5).map(s => s.totalCount),
      backgroundColor: ['#ff9800', '#ff5722', '#ffc107', '#ffab00', '#ff6f00']
    }]
  };

  const typeData = {
    labels: ['Impollinatori', 'Uccelli', 'Insetti', 'Altro'],
    datasets: [{
      data: faunaData.map(item => item.total || 0),
      backgroundColor: ['#ff9800', '#2196f3', '#9c27b0', '#4caf50']
    }]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-green-700 to-green-600 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">🦋 Monitoraggio Fauna</h1>
              <p className="text-green-100">Biodiversità negli orti urbani</p>
            </div>
            <div className="flex items-center space-x-4 flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-500 rounded-full text-sm">🟢 Live</span>
              <span className="text-sm">
                Aggiornato: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* STATISTICHE */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm">🐝 Impollinatori</p>
            <p className="text-2xl font-bold text-orange-700">
              {faunaData.find(item => item._id === 'pollinator')?.total || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">🐦 Uccelli</p>
            <p className="text-2xl font-bold text-blue-700">
              {faunaData.find(item => item._id === 'bird')?.total || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">🐛 Insetti</p>
            <p className="text-2xl font-bold text-purple-700">
              {faunaData.find(item => item._id === 'insect')?.total || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">🌿 Specie Totali</p>
            <p className="text-2xl font-bold text-green-700">{species.length}</p>
          </div>
        </section>

        {/* GRAFICI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Distribuzione Specie</h2>
            <div className="h-64">
              <Bar 
                data={pollinatorData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Tipologie</h2>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={typeData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* TABELLA OSSERVAZIONI */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Ultime Osservazioni</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Specie</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-center">Quantità</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{new Date(obs.date).toLocaleDateString()}</td>
                    <td className="p-2 font-medium">{obs.species?.[0]?.name || 'N/A'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        obs.species?.[0]?.type === 'pollinator' ? 'bg-orange-100 text-orange-700' :
                        obs.species?.[0]?.type === 'bird' ? 'bg-blue-100 text-blue-700' :
                        obs.species?.[0]?.type === 'insect' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {obs.species?.[0]?.type || 'altro'}
                      </span>
                    </td>
                    <td className="p-2 text-center font-bold">{obs.species?.[0]?.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RACCOMANDAZIONI */}
        <div className="mt-8 bg-green-50 rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-green-700 mb-3">💡 Raccomandazioni per la Biodiversità</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-green-700">
              <span>🌱</span> Pianta specie native per attirare più impollinatori
            </li>
            <li className="flex items-center gap-2 text-green-700">
              <span>🌸</span> Installa cassette per nidificazione di api solitarie
            </li>
            <li className="flex items-center gap-2 text-green-700">
              <span>💧</span> Crea piccole fonti d'acqua per uccelli e insetti
            </li>
            <li className="flex items-center gap-2 text-green-700">
              <span>🌿</span> Riduci l'uso di pesticidi per proteggere gli insetti utili
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
