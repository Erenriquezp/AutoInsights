// src/App.tsx
import { useState, useEffect } from 'react';
import './App.css';

// Components
import Header from './components/Header';
import GlobalMarketStats from './components/GlobalMarketStats';
import VehicleSelector from './components/VehicleSelector';
import KPICards from './components/KPICards';
import PriceChart from './components/PriceChart';
import MileageChart from './components/MileageChart';
import VolumeChart from './components/VolumeChart'; // <--- Importante
import { ConditionChart } from './components/ConditionChart';
import PriceHistogram from './components/PriceHistogram';
import { Map } from 'lucide-react';
import USAMap from './components/USAMap';

// Services & Types
import { api } from './services/api';
import type { MarketStats, VehicleAnalysis, MileageData, ConditionData, PriceHistogramData } from './types';

function App() {
  // Estado Global
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [conditionData, setConditionData] = useState<ConditionData[]>([]);
  const [priceHistogram, setPriceHistogram] = useState<PriceHistogramData[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // Estado de Análisis
  const [analysis, setAnalysis] = useState<VehicleAnalysis | null>(null);
  const [mileageData, setMileageData] = useState<MileageData[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState('');

  const [isMapOpen, setIsMapOpen] = useState(false); // Estado para abrir/cerrar mapa

  // 1. Cargar "Big Numbers" al montar
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const [statsData, conditionResp, priceHistResp] = await Promise.all([
          api.getMarketStats(),
          api.getMarketCondition(),
          api.getPriceHistogram()
        ]);

        setMarketStats(statsData);
        setConditionData(conditionResp);
        setPriceHistogram(priceHistResp);
      } catch (err) {
        console.error("Error cargando stats globales:", err);
      } finally {
        setLoadingGlobal(false);
      }
    };
    fetchGlobalStats();
  }, []);

  // 2. Manejar la búsqueda
  const handleSearch = async (brand: string, model: string) => {
    setLoadingAnalysis(true);
    setError('');
    setAnalysis(null);

    try {
      // Peticiones en paralelo
      const [analysisData, mileageResp] = await Promise.all([
        api.getAnalysis(brand, model),
        api.getMileage(brand, model)
      ]);

      setAnalysis(analysisData);
      setMileageData(mileageResp);
    } catch (err) {
      console.error(err);
      setError('No se encontraron datos suficientes para generar el reporte de este vehículo.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (

    
      

    <div className="app-container">
      <Header />
      
      {/* 1. Resumen de Mercado (Siempre visible) */}
      <section className="section-global">
        <GlobalMarketStats stats={marketStats} loading={loadingGlobal} />
        {/* Botón Flotante o en Header para abrir Mapa */}
        <div className="actions-bar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 2rem', marginTop: '-1rem' }}>
          <button 
            className="btn-map-trigger" 
            onClick={() => setIsMapOpen(true)}
          >
            <Map size={18} />
            Ver Mapa de Mercado
          </button>
        </div>
        <div className="global-charts-row">
          {conditionData.length > 0 && !loadingGlobal && (
            <div className="chart-wrapper condition-chart">
              <ConditionChart data={conditionData} />
            </div>
          )}
          {priceHistogram.length > 0 && !loadingGlobal && (
            <div className="chart-wrapper price-histogram-chart">
              <PriceHistogram data={priceHistogram} />
            </div>
          )}
        </div>
        <div>
          
          {/* COMPONENTE MAPA (Renderizado condicional pero controlado internamente) */}
          <USAMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
        </div>
      </section>

      <main className="main-content">
        {/* 2. Selector Inteligente */}
        <div className="search-section">
            <VehicleSelector onSearch={handleSearch} />
        </div>

        {/* Mensajes de carga/error */}
        {loadingAnalysis && (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Procesando Big Data...</p>
            </div>
        )}
        
        {error && <div className="error-msg">{error}</div>}

        {/* 3. Dashboard de Resultados */}
        {analysis && !loadingAnalysis && (
          <div className="dashboard-grid">
            
            {/* Fila 1: KPIs Numéricos */}
            <div className="dashboard-full-width">
               <KPICards summary={analysis.summary} vehicleName={analysis.vehicle} />
            </div>

            {/* Fila 2: Gráficos Principales (Lado a Lado en pantallas grandes) */}
            <div className="charts-row">
                {/* Curva de Precio */}
                <div className="chart-wrapper">
                  <h3>Curva de Depreciación</h3>
                  <PriceChart data={analysis.history} />
                </div>

                {/* Volumen (Confiabilidad) */}
                <div className="chart-wrapper">
                  <h3>Volumen de autos por año "Confiabilidad del precio"</h3>
                   {/* Pasamos analysis.history porque contiene el 'count' por año */}
                  <VolumeChart data={analysis.history} />
                </div>
            </div>

            {/* Fila 3: Scatter Plot (Ancho completo) */}
            <div className="chart-wrapper full-width">
              <h3>Análisis de Kilometraje vs Precio</h3>
              <MileageChart data={mileageData} />
            </div>
            
          </div>
          
        )}
      </main>
      
    </div>
  );
}

export default App;