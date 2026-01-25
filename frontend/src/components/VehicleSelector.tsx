import { useState, useEffect } from 'react';
import { Search, ChevronRight, Car, Tag, Loader2 } from 'lucide-react';
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
<div className="selector-container-wrapper">
      <div className="selector-card">
        
        {/* Paso 1: Marca */}
        <div className="selector-group">
          <label className="selector-label">
            <span className="step-badge">1</span> Selecciona Marca
          </label>
          <div className="input-wrapper">
            <Tag size={18} className="input-icon" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              disabled={loadingBrands}
              className="custom-select"
            >
              <option value="">{loadingBrands ? 'Cargando...' : 'Todas las marcas'}</option>
              {brands.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {/* Separador Visual (Flecha) */}
        <div className="selector-separator">
          <ChevronRight size={24} color="#cbd5e1" />
        </div>

        {/* Paso 2: Modelo */}
        <div className="selector-group">
          <label className="selector-label">
            <span className="step-badge">2</span> Selecciona Modelo
          </label>
          <div className="input-wrapper">
            <Car size={18} className="input-icon" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand || loadingModels}
              className="custom-select"
            >
              <option value="">
                {loadingModels ? 'Cargando modelos...' : !selectedBrand ? 'Primero selecciona marca' : 'Todos los modelos'}
              </option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Botón de Acción */}
        <div className="selector-action">
          <button
            className="btn-analyze-hero"
            onClick={() => onSearch(selectedBrand, selectedModel)}
            disabled={!selectedBrand || !selectedModel}
          >
            {loadingModels ? <Loader2 className="spinner" /> : <Search size={20} />}
            <span>Analizar Vehículo</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default VehicleSelector;