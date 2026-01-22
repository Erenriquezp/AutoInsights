import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { BrandVolume } from '../types';

interface BrandVolumeChartProps {
  data: BrandVolume[];
}

export const BrandVolumeChart = ({ data }: BrandVolumeChartProps) => {
  const total = data.reduce((acc, b) => acc + b.total, 0);

  return (
    <div className="chart-container">
      <h3 className="chart-title">
        Volumen de Mercado (Top 10)
        <span style={{ float: 'right', fontSize: '0.9rem', color: '#94a3b8' }}>
          Total: {total.toLocaleString()}
        </span>
      </h3>

      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        Cantidad de vehículos disponibles por marca
      </p>

      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 90, right: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="brand" width={100} />
          <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString()} autos`} />
          <Bar dataKey="total" fill="#38bdf8" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
