// src/services/api.ts
import axios from 'axios';
import type { MarketStats, VehicleAnalysis, MileageData, ConditionData, PriceHistogramData } from '../types';

// Asegúrate de que este puerto coincida con tu docker-compose (8000)
const API_URL = 'http://localhost:8000/api';

export const api = {
  // --- NUEVO: Estadísticas Globales ---
  getMarketStats: async (): Promise<MarketStats> => {
    const response = await axios.get<MarketStats>(`${API_URL}/market/stats`);
    return response.data;
  },

  // Distribución de condición de vehículos
  getMarketCondition: async (): Promise<ConditionData[]> => {
    const response = await axios.get<ConditionData[]>(`${API_URL}/market/condition`);
    return response.data;
  },

  // Obtener Marcas
  getBrands: async (): Promise<string[]> => {
    const response = await axios.get<string[]>(`${API_URL}/brands`);
    return response.data;
  },

  // Obtener Modelos
  getModels: async (brand: string): Promise<string[]> => {
    const response = await axios.get<string[]>(`${API_URL}/models/${brand}`);
    return response.data;
  },

  // Análisis Específico (Depreciación)
  getAnalysis: async (brand: string, model: string): Promise<VehicleAnalysis> => {
    const response = await axios.get<VehicleAnalysis>(`${API_URL}/analysis`, {
      params: { brand, model }
    });
    return response.data;
  },

  // Kilometraje
  getMileage: async (brand: string, model: string): Promise<MileageData[]> => {
    const response = await axios.get<MileageData[]>(`${API_URL}/mileage`, {
      params: { brand, model }
    });
    // Sanitizar datos: asegurar números y valores positivos
    return (response.data || [])
      .map(d => ({
        price: typeof d.price === 'number' ? d.price : Number(d.price),
        odometer: typeof d.odometer === 'number' ? d.odometer : Number(d.odometer)
      }))
      .filter(d => Number.isFinite(d.price) && Number.isFinite(d.odometer) && d.price > 0 && d.odometer >= 0);
  },

  // Histograma de Precios
  getPriceHistogram: async (): Promise<PriceHistogramData[]> => {
    const response = await axios.get<PriceHistogramData[]>(`${API_URL}/market/histogram`);
    return response.data;
  }
};