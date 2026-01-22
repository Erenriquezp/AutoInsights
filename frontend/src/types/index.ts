export interface HistoryDataPoint {
  year: number;
  price: number;
  count: number;
}

export interface MileageDataPoint {
  odometer: number;
  price: number;
}

export interface BrandVolume {
  brand: string;
  total: number;
}

export interface KPIData {
  avg_price: number;
  total_samples: number;
  trend: string;
}

export interface AnalysisData {
  vehicle: string;
  kpis: KPIData;
  history: HistoryDataPoint[];
}
