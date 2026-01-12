import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Car, Search, TrendingDown, DollarSign, Activity } from 'lucide-react';

// URL Base de tu API FastAPI (localhost:8000)
const API_URL = 'http://localhost:8000/api';

function App() {
  // --- ESTADOS (Variables de la app) ---
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
          AutoInsights <span style={{fontWeight: 300, color: '#64748b'}}>Big Data Analytics</span>
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

      {/* ÁREA DE RESULTADOS */}
      {error && <div style={{color: 'red', textAlign: 'center'}}>{error}</div>}

      {analysisData && (
        <div className="results-section fade-in">
          
          {/* TARJETAS DE KPI */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title"><DollarSign size={16} style={{display:'inline'}}/> Precio Promedio</div>
              <div className="kpi-value">${analysisData.kpis.avg_price.toLocaleString()}</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-title"><Activity size={16} style={{display:'inline'}}/> Muestras Analizadas</div>
              <div className="kpi-value">{analysisData.kpis.total_samples} autos</div>
            </div>

            <div className="kpi-card" style={{borderLeftColor: '#ef4444'}}>
              <div className="kpi-title"><TrendingDown size={16} style={{display:'inline'}}/> Tendencia Histórica</div>
              <div className="kpi-value" style={{color: '#ef4444'}}>{analysisData.kpis.trend}</div>
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
                  tickFormatter={(value) => `$${value/1000}k`} 
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

        </div>
      )}

      {!analysisData && !loading && (
        <div className="loading-spinner">
          <p>Selecciona un vehículo arriba para ver la inteligencia de mercado.</p>
        </div>
      )}
    </div>
  );
}

export default App;