import { Search } from 'lucide-react';

interface VehicleSelectorProps {
  brands: string[];
  models: string[];
  selectedBrand: string;
  selectedModel: string;
  loading: boolean;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  onAnalyze: () => void;
}

export const VehicleSelector = ({
  brands,
  models,
  selectedBrand,
  selectedModel,
  loading,
  onBrandChange,
  onModelChange,
  onAnalyze
}: VehicleSelectorProps) => {
  return (
    <div className="controls-card">
      <div className="form-group">
        <label>1. Selecciona Marca</label>
        <select
          value={selectedBrand}
          onChange={(e) => onBrandChange(e.target.value)}
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
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!selectedBrand}
        >
          <option value="">-- Modelo --</option>
          {models.map(model => (
            <option key={model} value={model}>
              {model.length > 30 ? model.substring(0, 30) + '...' : model}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn-analyze"
        onClick={onAnalyze}
        disabled={!selectedBrand || !selectedModel || loading}
      >
        {loading ? 'Procesando...' : <><Search size={20} /> Analizar Depreciación</>}
      </button>
    </div>
  );
};
