import { useState } from 'react';
import { api } from '../services/api';
import type { VehicleAnalysis, MileageDataPoint } from '../types';

export const useAnalysis = () => {
  const [analysisData, setAnalysisData] = useState<VehicleAnalysis | null>(null);
  const [mileageData, setMileageData] = useState<MileageDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeVehicle = async (brand: string, model: string) => {
    if (!brand || !model) return;

    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const [analysis, mileage] = await Promise.all([
        api.getAnalysis(brand, model),
        api.getMileage(brand, model).catch(() => [])
      ]);

      setAnalysisData(analysis);
      setMileageData(mileage);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los datos. Intenta con otro vehículo.");
    } finally {
      setLoading(false);
    }
  };

  return {
    analysisData,
    mileageData,
    loading,
    error,
    analyzeVehicle
  };
};
