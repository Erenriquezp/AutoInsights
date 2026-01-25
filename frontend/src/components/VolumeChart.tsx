import { BarChart as BarIcon } from 'lucide-react';
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

// Tooltip Personalizado (Estilo Unificado)
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: '#1e293b',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        border: '1px solid #334155'
      }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>
          Año {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: '#06b6d4' 
          }}></span>
          <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>
            {payload[0].value.toLocaleString()} autos
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const VolumeChart = ({ data }: VolumeChartProps) => {
  return (
    <div className="chart-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Interno */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
          Disponibilidad en el Mercado
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarIcon size={14} />
          Volumen de inventario detectado por año
        </p>
      </div>

      <div style={{ flex: 1, minHeight: '280px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Gradiente Vertical para las Barras (Cian a Azul) */}
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={1}/> {/* Cian Brillante */}
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.8}/> {/* Azul Cielo */}
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            
            <XAxis 
              dataKey="year" 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
              minTickGap={15} // Evita que los años se encimen
            />
            
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)', radius: 4 }} // Fondo gris suave al pasar el mouse
            />
            
            <Bar 
              dataKey="count" 
              fill="url(#volumeGradient)" 
              radius={[4, 4, 0, 0]} // Bordes redondeados arriba
              maxBarSize={50} // Evita que sean demasiado anchas si hay pocos datos
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
        * Años con barras bajas pueden presentar precios promedio menos representativos.
      </div>
    </div>
  );
};

export default VolumeChart;