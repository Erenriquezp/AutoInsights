import { useState, useEffect } from 'react';
import type { GoogleChartData } from '../types/mapTypes';
import { fetchMapData } from '../services/mapService';

interface UseMapDataReturn {
  data: GoogleChartData;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cargar datos del mapa cuando se abre el modal
 * Utiliza caché simple: carga solo la primera vez que se abre
 * @param isOpen - Indica si el modal está abierto
 * @returns Datos del mapa, estado de carga y error (si aplica)
 */
export const useMapData = (isOpen: boolean): UseMapDataReturn => {
  const [data, setData] = useState<GoogleChartData>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Solo cargamos si el modal está abierto y no hemos cargado aún
    if (isOpen && !hasLoaded) {
      fetchMapData()
        .then(chartData => {
          setData(chartData);
          setHasLoaded(true);
          setLoading(false);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : "Error desconocido cargando datos del mapa.");
          setHasLoaded(true);
          setLoading(false);
        });
    }
  }, [isOpen, hasLoaded]);

  return { data, loading, error };
};