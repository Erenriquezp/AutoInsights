import axios from 'axios';
import type { GeoData, GoogleChartData } from '../types/mapTypes';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Convierte datos de API a formato de Google Charts
 * @param apiData - Datos del servidor
 * @returns Datos formateados para Google Charts con header
 */
export const transformToGoogleChartFormat = (apiData: GeoData[]): GoogleChartData => {
  if (!apiData || apiData.length === 0) {
    return [["State", "Vehículos Disponibles", "Precio Promedio"]];
  }

  const header = [["State", "Vehículos Disponibles", "Precio Promedio"]];
  const body = apiData.map(item => {
    // Convertir 'tx' a 'US-TX' (ISO 3166-2)
    const stateCode = `US-${item.state.toUpperCase()}`;
    return [stateCode, item.count, item.avg_price];
  });

  return [...header, ...body] as GoogleChartData;
};

/**
 * Obtiene datos de mapa del servidor
 * @returns Datos transformados para Google Charts
 */
export const fetchMapData = async (): Promise<GoogleChartData> => {
  try {
    const response = await axios.get<GeoData[]>(`${API_BASE_URL}/market/map`);
    return transformToGoogleChartFormat(response.data);
  } catch (error) {
    console.error('Error fetching map data:', error);
    throw new Error('Error cargando los datos del mapa.');
  }
};
