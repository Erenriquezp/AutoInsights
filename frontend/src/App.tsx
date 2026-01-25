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
      <Header onOpenMap={() => setIsMapOpen(true)} />
      
      {/* 1. SECCIÓN GLOBAL (Stats + Gráficos Generales) */}
      <section className="section-global">
        {/* Big Numbers */}
        <GlobalMarketStats stats={marketStats} loading={loadingGlobal} />

        {/* Gráficos Globales (Grid de 2 columnas) */}
        <div className="global-charts-row">
          {conditionData.length > 0 && !loadingGlobal && (
            // Agregamos chart-card para que tenga estilo unificado
            <div className="chart-card condition-chart"> 
              <ConditionChart data={conditionData} />
            </div>
          )}
          {priceHistogram.length > 0 && !loadingGlobal && (
            <div className="chart-card price-histogram-chart">
              <PriceHistogram data={priceHistogram} />
            </div>
          )}
        </div>

        {/* El mapa es un modal, no ocupa espacio visual aquí */}
        <USAMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      </section>

      {/* 2. ZONA DE ANÁLISIS PRINCIPAL */}
      <main className="main-content">
        
        {/* Selector (Con margen inferior grande definido en CSS) */}
        <div className="search-section">
            <VehicleSelector onSearch={handleSearch} />
        </div>

        {/* Loading / Error */}
        {loadingAnalysis && (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Analizando millones de registros...</p>
            </div>
        )}
        
        {error && <div className="error-msg">{error}</div>}

        {/* DASHBOARD DE RESULTADOS */}
        {analysis && !loadingAnalysis && (
          <div className="dashboard-grid">
            
            {/* FILA 1: KPIs (Ya tiene su propio grid interno) */}
            <div className="dashboard-full-width">
               <KPICards summary={analysis.summary} vehicleName={analysis.vehicle} />
            </div>

            {/* FILA 2: Gráficos de Precio y Volumen */}
            <div className="charts-row">
                <div className="chart-wrapper">
                  {/* El título ya viene dentro del componente PriceChart si usaste mi código anterior, 
                      si no, descomenta la línea de abajo */}
                  {/* <h3>Curva de Depreciación</h3> */}
                  <PriceChart data={analysis.history} />
                </div>

                <div className="chart-wrapper">
                   {/* Igual aquí, el título idealmente va dentro del componente */}
                  <VolumeChart data={analysis.history} />
                </div>
            </div>

            {/* FILA 3: Scatter Plot (Ancho completo) */}
            <div className="chart-wrapper full-width">
              {/* MileageChart ya tiene título interno */}
              <MileageChart data={mileageData} />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;