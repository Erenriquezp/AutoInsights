// 1. Estadísticas Globales (Lo nuevo)
export interface MarketStats {
  total_vehicles: number;
  total_brands: number;
  total_models: number;
  avg_market_price: number;
  most_expensive: number;
  cheapest: number;
  oldest_year: number;
  newest_year: number;
}

// 2. Respuesta de Análisis por Vehículo (Actualizado)
export interface VehicleAnalysis {
  vehicle: string;
  summary: {
    avg_price: number;
    total_samples: number;
    depreciation_text: string;
    depreciation_value: number;
  };
  history: HistoryDataPoint[]; // Reutilizamos la interfaz 
}

// Alias usado por hooks/componentes
export type AnalysisData = VehicleAnalysis;

// 3. Puntos para Gráfica de Kilometraje
export interface MileageData {
  price: number;
  odometer: number;
}

// 4. Alias para MileageDataPoint
export type MileageDataPoint = MileageData;

// 5. Punto de Historial para Gráficas
export interface HistoryDataPoint {
  year: number;
  avg_price: number;
  count: number;
}

// 6. KPI Data
export interface KPIData {
  avg_price: number;
  total_samples: number;
  depreciation_text: string;
  depreciation_value: number;
}

// 7. Brand Volume
export interface BrandVolume {
  manufacturer: string;
  total_vehicles: number;
}

// Distribución de condición de vehículos (para donut chart)
export interface ConditionData {
  condition: string;
  count: number;
  [key: string]: string | number;
}

// Histograma de precios (para bar chart)
export interface PriceHistogramData {
  price_range: number;
  count: number;
}
