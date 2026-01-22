import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { HistoryDataPoint } from '../types';

interface PriceChartProps {
  data: HistoryDataPoint[];
  vehicleName: string;
}

export const PriceChart = ({ data, vehicleName }: PriceChartProps) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">
        Precio promedio por año de fabricación ({vehicleName})
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" />
          <YAxis
            tickFormatter={(value) => `$${value / 1000}k`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Precio Promedio']}
            labelFormatter={(label) => `Año: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
