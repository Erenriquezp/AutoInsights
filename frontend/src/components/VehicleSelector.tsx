import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api'; // Importamos la API aquí

interface VehicleSelectorProps {
  onSearch: (brand: string, model: string) => void;
}

export const VehicleSelector = ({ onSearch }: VehicleSelectorProps) => {
  // Estado interno del selector
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  // 1. Cargar Marcas al montar
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await api.getBrands();
        setBrands(data);
      } catch (err) {
        console.error("Error cargando marcas", err);
      } finally {
        setLoadingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  // 2. Cargar Modelos cuando cambia la marca
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const data = await api.getModels(selectedBrand);
        setModels(data);
        setSelectedModel(''); // Resetear modelo al cambiar marca
      } catch (err) {
        console.error("Error cargando modelos", err);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedBrand]);

  return (
    <div className="controls-card">
      {/* Selector de Marca */}
      <div className="form-group">
        <label>1. Selecciona Marca</label>
        <div className="select-wrapper">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            disabled={loadingBrands}
          >
            <option value="">{loadingBrands ? 'Cargando...' : '-- Marca --'}</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Selector de Modelo */}
      <div className="form-group">
        <label>2. Selecciona Modelo</label>
        <div className="select-wrapper">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedBrand || loadingModels}
          >
            <option value="">
              {loadingModels ? 'Cargando modelos...' : '-- Modelo --'}
            </option>
            {models.map(model => (
              <option key={model} value={model}>
                {model.length > 25 ? model.substring(0, 25) + '...' : model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botón de Acción */}
      <button
        className="btn-analyze"
        onClick={() => onSearch(selectedBrand, selectedModel)}
        disabled={!selectedBrand || !selectedModel}
      >
        <Search size={20} /> 
        Analizar
      </button>
    </div>
  );
};

export default VehicleSelector;