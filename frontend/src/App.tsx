import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { Car, Search, TrendingDown, DollarSign, Activity } from 'lucide-react';

// URL Base de tu API FastAPI (localhost:8000)
const API_URL = 'http://localhost:8000/api';

function App() {
  // --- ESTADOS (Variables de la app) ---
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [brandVolume, setBrandVolume] = useState([]); //


  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const top10Brands = brandVolume
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);


  // --- EFECTOS (Qué pasa al cargar) ---

  // 1. Cargar Marcas al iniciar
  useEffect(() => {
    axios.get(`${API_URL}/brands`)
      .then(res => setBrands(res.data))
      .catch(err => console.error("Error cargando marcas:", err));
  }, []);

  // 2. Cargar Modelos cuando cambia la Marca
  useEffect(() => {
    if (selectedBrand) {
      setModels([]); // Limpiar modelos anteriores
      axios.get(`${API_URL}/models/${selectedBrand}`)
        .then(res => setModels(res.data))
        .catch(err => console.error("Error cargando modelos:", err));
    }
  }, [selectedBrand]);

  useEffect(() => { //
    axios.get('http://localhost:8000/api/kpi/brand-volume')
      .then(res => setBrandVolume(res.data))
      .catch(err => console.error("Error cargando volumen por marca:", err));
  }, []);


  // --- HANDLERS (Eventos) ---
  const handleAnalyze = () => {
    if (!selectedBrand || !selectedModel) return;

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    // Llamada al endpoint principal de análisis
    axios.get(`${API_URL}/analysis`, {
      params: { brand: selectedBrand, model: selectedModel }
    })
      .then(res => {
        setAnalysisData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("No se pudieron cargar los datos. Intenta con otro vehículo.");
        setLoading(false);
      });
  };

  // --- RENDERIZADO (HTML/JSX) ---
  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="header">
        <h1>
          <Car size={32} color="#2563eb" />
          AutoInsights <span style={{ fontWeight: 300, color: '#64748b' }}>Big Data Analytics</span>
        </h1>
      </header>

      {/* BARRA DE CONTROL (FILTROS) */}
      <div className="controls-card">
        <div className="form-group">
          <label>1. Selecciona Marca</label>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setSelectedModel(''); // Resetear modelo al cambiar marca
            }}
          >
            <option value="">-- Marca --</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>2. Selecciona Modelo</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedBrand}
          >
            <option value="">-- Modelo --</option>
            {models.map(model => (
              // Cortamos nombres muy largos para que no rompan el diseño
              <option key={model} value={model}>
                {model.length > 30 ? model.substring(0, 30) + '...' : model}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-analyze"
          onClick={handleAnalyze}
          disabled={!selectedBrand || !selectedModel || loading}
        >
          {loading ? 'Procesando...' : <><Search size={20} /> Analizar Depreciación</>}
        </button>
      </div>

      {/* ================= DASHBOARD GRID ================= */}
      <div className="dashboard-grid">

        {/* ================= COLUMNA IZQUIERDA ================= */}
        <div className="left-panel">

          {/* ÁREA DE RESULTADOS */}
          {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}

          {analysisData ? (
            <div className="results-section fade-in">



              {/* TARJETAS DE KPI */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-title"><DollarSign size={16} style={{ display: 'inline' }} /> Precio Promedio</div>
                  <div className="kpi-value">${analysisData.kpis.avg_price.toLocaleString()}</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-title"><Activity size={16} style={{ display: 'inline' }} /> Muestras Analizadas</div>
                  <div className="kpi-value">{analysisData.kpis.total_samples} autos</div>
                </div>

                <div className="kpi-card" style={{ borderLeftColor: '#ef4444' }}>
                  <div className="kpi-title"><TrendingDown size={16} style={{ display: 'inline' }} /> Tendencia Histórica</div>
                  <div className="kpi-value" style={{ color: '#ef4444' }}>{analysisData.kpis.trend}</div>
                </div>
              </div>

              {/* GRÁFICO PRINCIPAL */}
              <div className="chart-container">
                <h3 className="chart-title">Precio promedio por año de fabricación ({analysisData.vehicle})</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={analysisData.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis
                      tickFormatter={(value) => `$${value / 1000}k`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Precio Promedio']}
                      labelFormatter={(label) => `Año: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>


              {/* GRÁFICO DE VOLUMEN POR AÑO */}
              <div className="chart-container" style={{ height: '350px' }}>
                <h3 className="chart-title">
                  Volumen de autos por año (Confiabilidad del precio)
                </h3>

                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysisData.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />

                    {/* Año → categoría */}
                    <XAxis dataKey="year" />

                    {/* Cantidad → numérico */}
                    <YAxis />

                    <Tooltip
                      formatter={(value) => [`${value} autos`, 'Cantidad']}
                      labelFormatter={(label) => `Año: ${label}`}
                    />

                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <p style={{ marginTop: '1.5rem', fontStyle: 'italic', color: '#475569' }}>
                  A mayor volumen de autos analizados, mayor confiabilidad del precio promedio.
                </p>
              </div>




            </div>
          ) : (
            <div className="loading-spinner">
              <p>Selecciona un vehículo arriba para ver la inteligencia de mercado.</p>
            </div>
          )}
        </div> {/* fin left-panel */}

        {/* COLUMNA DERECHA */}
        <div className="right-panel">

          <div className="chart-container">
            <h3 className="chart-title">
              Volumen de Mercado (Top 10)
              <span style={{ float: 'right', fontSize: '0.9rem', color: '#94a3b8' }}>
                Total: {top10Brands.reduce((acc, b) => acc + b.total, 0).toLocaleString()}
              </span>
            </h3>

            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
              Cantidad de vehículos disponibles por marca
            </p>

            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={top10Brands}
                layout="vertical"
                margin={{ left: 90, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="brand" width={100} />
                <Tooltip formatter={(v) => `${v.toLocaleString()} autos`} />
                <Bar dataKey="total" fill="#38bdf8" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>


      </div> {/* fin dashboard-grid */}

    </div>
  );
}

export default App;