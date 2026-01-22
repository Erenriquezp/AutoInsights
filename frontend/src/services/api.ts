import axios from 'axios';
import type { AnalysisData, BrandVolume, MileageDataPoint } from '../types';

const API_URL = 'http://localhost:8000/api';

export const apiService = {
  async getBrands(): Promise<string[]> {
    const response = await axios.get(`${API_URL}/brands`);
    return response.data;
  },

  async getModels(brand: string): Promise<string[]> {
    const response = await axios.get(`${API_URL}/models/${brand}`);
    return response.data;
  },

  async getAnalysis(brand: string, model: string): Promise<AnalysisData> {
    const response = await axios.get(`${API_URL}/analysis`, {
      params: { brand, model }
    });
    return response.data;
  },

  async getMileageData(brand: string, model: string): Promise<MileageDataPoint[]> {
    const response = await axios.get(`${API_URL}/mileage`, {
      params: { brand, model }
    });
    return response.data;
  },

  async getBrandVolume(): Promise<BrandVolume[]> {
    const response = await axios.get(`${API_URL}/kpi/brand-volume`);
    return response.data;
  }
};
