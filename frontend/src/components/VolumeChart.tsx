import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { HistoryDataPoint } from '../types';

interface VolumeChartProps {
  data: HistoryDataPoint[];
}

export const VolumeChart = ({ data }: VolumeChartProps) => {
  return (
    <div className="chart-container" style={{ height: '350px' }}>
      <h3 className="chart-title">
        Volumen de autos por año (Confiabilidad del precio)
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip
            formatter={(value) => [`${value} autos`, 'Cantidad']}
            labelFormatter={(label) => `Año: ${label}`}
          />
          <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <p style={{ marginTop: '1.5rem', fontStyle: 'italic', color: '#475569' }}>
        A mayor volumen de autos analizados, mayor confiabilidad del precio promedio.
      </p>
    </div>
  );
};
