import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useVehicleSelector = () => {
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Cargar marcas al iniciar
  useEffect(() => {
    apiService.getBrands()
      .then(data => setBrands(data))
      .catch(err => console.error("Error cargando marcas:", err));
  }, []);

  // Cargar modelos cuando cambia la marca
  useEffect(() => {
    if (selectedBrand) {
      setModels([]);
      apiService.getModels(selectedBrand)
        .then(data => setModels(data))
        .catch(err => console.error("Error cargando modelos:", err));
    }
  }, [selectedBrand]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
  };

  return {
    brands,
    models,
    selectedBrand,
    selectedModel,
    setSelectedBrand: handleBrandChange,
    setSelectedModel
  };
};
