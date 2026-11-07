// Response shapes of the AutoInsights API. Keep in sync with backend/services.py and main.py.

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

export interface YearTrend {
  year: number;
  avg_price_year: number;
  volume_year: number;
}

export interface ConditionCount {
  condition: string;
  count: number;
}

export interface PriceBucket {
  price_range: number;
  count: number;
}

export interface StateStats {
  state: string;
  count: number;
  avg_price: number;
}

export interface BrandCount {
  manufacturer: string;
  count: number;
}

export interface ModelYear {
  manufacturer: string;
  model: string;
  year: number;
  avg_price: number;
  count: number;
}

export interface FiveYearChange {
  from_year: number;
  to_year: number;
  from_price: number;
  to_price: number;
  pct: number;
}

export interface VehicleAnalysis {
  vehicle: string;
  summary: {
    avg_price: number;
    total_samples: number;
    min_year_listings: number;
    five_year_change: FiveYearChange | null;
  };
  history: ModelYear[];
}

export interface MileagePoint {
  odometer: number;
  price: number;
}

export type ChartType = 'number' | 'line' | 'bar' | 'table';

export interface AskAnswer {
  question: string;
  sql: string;
  columns: string[];
  rows: (string | number | null)[][];
  chart: { type: ChartType; x: string | null; y: string | null };
  provider: string;
}
