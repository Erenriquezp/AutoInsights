import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { PriceHistogramData } from '../types';

export const PriceHistogram = ({ data }: { data: PriceHistogramData[] }) => {
  return (
    <div className="chart-wrapper">
      <h3>Distribución de Precios</h3>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
        Concentración de vehículos por rango de precio ($2k)
      </p>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="price_range" 
              tickFormatter={(val) => `$${val/1000}k`}
              tick={{ fontSize: 11 }}
            />
            <YAxis hide />
            <Tooltip
              labelFormatter={(label) => `Rango: $${label} - $${Number(label) + 2000}`}
              formatter={(value: number | undefined) => value !== undefined ? [value.toLocaleString(), 'Vehículos'] : ['N/A', 'Vehículos']}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistogram;