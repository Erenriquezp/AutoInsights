import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { PriceHistogramData } from '../types';


export const PriceHistogram = ({ data }: { data: PriceHistogramData[] }) => {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Distribución de Precios</h3>
        <span className="chart-subtitle">Concentración de volumen por rango ($2k)</span>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            {/* Definición del Gradiente */}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            
            <XAxis 
              dataKey="price_range" 
              tickFormatter={(val) => `$${val/1000}k`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              minTickGap={30} // Evita que los textos se encimen
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(val) => `${val}`}
            />
            
            <Tooltip
              cursor={{ 
                fill: 'rgba(59, 130, 246, 0.1)', // Azul muy suave transparente
                radius: 4 // Bordes redondeados en el highlight
              }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '8px', 
                color: '#fff',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number | undefined) => value !== undefined ? [value.toLocaleString(), 'Vehículos'] : ['N/A', 'Vehículos']}
              labelFormatter={(label) => `Rango: $${Number(label).toLocaleString()}`}
            />
            
            <Bar 
              dataKey="count" 
              fill="url(#barGradient)" 
              radius={[4, 4, 0, 0]} 
              barSize={20}
              
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistogram;