import './App.css';
import { Header } from './components/Header';
import { VehicleSelector } from './components/VehicleSelector';
import { KPICards } from './components/KPICards';
import { PriceChart } from './components/PriceChart';
import { VolumeChart } from './components/VolumeChart';
import { MileageChart } from './components/MileageChart';
import { BrandVolumeChart } from './components/BrandVolumeChart';
import { useVehicleSelector } from './hooks/useVehicleSelector';
import { useAnalysis } from './hooks/useAnalysis';
import { useBrandVolume } from './hooks/useBrandVolume';

function App() {
  const {
    brands,
    models,
    selectedBrand,
    selectedModel,
    setSelectedBrand,
    setSelectedModel
  } = useVehicleSelector();

  const {
    analysisData,
    mileageData,
    loading,
    error,
    analyzeVehicle
  } = useAnalysis();

  const { top10Brands } = useBrandVolume();

  const handleAnalyze = () => {
    analyzeVehicle(selectedBrand, selectedModel);
  };

  return (
    <div className="dashboard-container">
      <Header />

      <VehicleSelector
        brands={brands}
        models={models}
        selectedBrand={selectedBrand}
        selectedModel={selectedModel}
        loading={loading}
        onBrandChange={setSelectedBrand}
        onModelChange={setSelectedModel}
        onAnalyze={handleAnalyze}
      />

      <div className="dashboard-grid">
        <div className="left-panel">
          {error && <div className="error-message">{error}</div>}

          {analysisData ? (
            <div className="results-section fade-in">
              <KPICards kpis={analysisData.kpis} />
              <PriceChart data={analysisData.history} vehicleName={analysisData.vehicle} />
              <VolumeChart data={analysisData.history} />
              <MileageChart data={mileageData} vehicleName={analysisData.vehicle} />
            </div>
          ) : (
            <div className="loading-spinner">
              <p>Selecciona un vehículo arriba para ver la inteligencia de mercado.</p>
            </div>
          )}
        </div>

        <div className="right-panel">
          <BrandVolumeChart data={top10Brands} />
        </div>
      </div>
    </div>
  );
}

export default App;