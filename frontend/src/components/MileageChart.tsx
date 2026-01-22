import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { MileageDataPoint } from '../types';

interface MileageChartProps {
  data: MileageDataPoint[];
  vehicleName: string;
}

export const MileageChart = ({ data, vehicleName }: MileageChartProps) => {
  return (
    <div className="chart-container" style={{ height: '350px' }}>
      <h3 className="chart-title">
        Factor Kilometraje
        <span style={{ float: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>
          ● Cada punto = 1 vehículo
        </span>
      </h3>

      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        Relación Precio vs. Kilometraje – {vehicleName}
      </p>

      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <XAxis
            type="number"
            dataKey="odometer"
            name="Kilometraje"
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="Precio"
            tickFormatter={(v) => `$${v / 1000}k`}
          />
          <Tooltip />
          <Scatter data={data} fill="#38bdf8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
