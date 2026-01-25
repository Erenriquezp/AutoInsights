import { Info } from 'lucide-react'; // Asegúrate de tener lucide-react instalado
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import type { HistoryDataPoint } from '../types';

interface PriceChartProps {
  data: HistoryDataPoint[];
}

// Tooltip Personalizado para un look más "App"
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: '#1e293b', // Slate 900
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        border: '1px solid #334155'
      }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>
          Modelo Año {label}
        </p>
        <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const PriceChart = ({ data }: PriceChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-wrapper flex-center" style={{ minHeight: '400px' }}>
        <p style={{ color: '#94a3b8' }}>No hay datos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="chart-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Interno */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
          Curva de Precio de Mercado
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} />
          Valor promedio actual según año de fabricación
        </p>
      </div>

      <div style={{ flex: 1, minHeight: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {/* Gradiente de Relleno Azul Suave */}
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
              </linearGradient>
              
              {/* Filtro de Sombra para la Línea (Efecto Glow) */}
              <filter id="shadow" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.5"/>
              </filter>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            
            <XAxis 
              dataKey="year" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              width={50}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            
            <Tooltip content={<CustomTooltip />} 
            cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
            />
            
            <Area 
              type="monotone" // Curva suave
              dataKey="avg_price" 
              stroke="#2563eb" // Azul intenso para la línea
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              filter="url(#shadow)" // Aplica el glow
              activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#2563eb' }} // Punto blanco al hacer hover
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;