import { BarChart as BarIcon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { HistoryDataPoint } from '../types';

interface VolumeChartProps {
  data: HistoryDataPoint[];
}

export const VolumeChart = ({ data }: VolumeChartProps) => {
  return (
    <div className="chart-container" style={{ width: '100%', height: 'auto', minHeight: '350px' }}>
      
      {/* --- NUEVO ENCABEZADO --- */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          Disponibilidad en el Mercado
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
          <BarIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          Cantidad de vehículos encontrados para cada año.
          <span style={{ display: 'block', marginTop: '4px', fontStyle: 'italic', fontSize: '0.8rem', color: '#94a3b8' }}>
            * Pocos datos = Precio promedio menos confiable.
          </span>
        </p>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} width={40} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
              formatter={(value) => [`${value} autos`, 'Disponibilidad']}
              labelFormatter={(label) => `Año: ${label}`}
            />
            <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;