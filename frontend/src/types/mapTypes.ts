export interface GeoData {
  state: string;     // ej: "tx", "ca"
  count: number;     // ej: 1500
  avg_price: number; // ej: 25000
}

export type GoogleChartData = [string, string | number, string | number][];