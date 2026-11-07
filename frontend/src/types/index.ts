// Response shapes of the AutoInsights API. Keep in sync with backend/services.py.

// GET /api/market/stats
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

// GET /api/vehicles/depreciation
export interface VehicleAnalysis {
  vehicle: string;
  summary: KPISummary;
  history: HistoryDataPoint[];
}

export interface KPISummary {
  avg_price: number;
  total_samples: number;
  depreciation_text: string;
  depreciation_value: number;
}

// One model year in a depreciation history
export interface HistoryDataPoint {
  year: number;
  avg_price: number;
  count: number;
}

// GET /api/vehicles/mileage
export interface MileageData {
  price: number;
  odometer: number;
}

export type MileageDataPoint = MileageData;

// GET /api/market/condition (donut chart)
export interface ConditionData {
  condition: string;
  count: number;
  [key: string]: string | number;
}

// GET /api/market/histogram (bar chart)
export interface PriceHistogramData {
  price_range: number;
  count: number;
}
