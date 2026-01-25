import { Gauge, Info } from 'lucide-react'; // Icono de tacómetro/medidor
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label
} from 'recharts';
import type { MileageData } from '../types';

interface MileageChartProps {
  data: MileageData[];
}

export const MileageChart = ({ data }: MileageChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container flex items-center justify-center" style={{ height: '400px' }}>
        <p style={{ color: '#94a3b8' }}>No hay datos de kilometraje disponibles para este análisis.</p>
      </div>
    );
  }

  return (
    <div className="chart-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* --- 1. Header con Icono y Explicación --- */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Análisis de Kilometraje vs. Precio
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={14} />
            Distribución de mercado según el uso del vehículo
          </p>
          {/* Pequeña leyenda de ayuda visual */}
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
            <Info size={12} />
            Cada punto es un vehículo vendido
          </div>
        </div>
      </div>

      {/* --- 2. GRÁFICA DE DISPERSIÓN --- */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
            
            {/* Eje X: Kilometraje */}
            <XAxis 
              type="number" 
              dataKey="odometer" 
              name="Kilometraje" 
              unit="km"
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              tick={{ fill: '#64748b', fontSize: 11 }}
              dy={10}
            >
              <Label 
                value="Kilometraje Acumulado" 
                offset={12} 
                position="bottom" 
                style={{ fill: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }} 
              />
            </XAxis>
            
            {/* Eje Y: Precio */}
            <YAxis 
              type="number" 
              dataKey="price" 
              name="Precio" 
              unit="$"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false} // Sin línea de eje
              tickLine={false}
              width={40}
            />
            
            {/* Tooltip oscuro y elegante */}
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="custom-tooltip" style={{ 
                      backgroundColor: '#0f172a', // Fondo casi negro
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '1px solid #1e293b',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Vehículo Detectado
                        </span>
                        <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700' }}>
                          ${d.price.toLocaleString()}
                        </span>
                        <span style={{ color: '#38bdf8', fontSize: '0.9rem' }}>
                          {d.odometer.toLocaleString()} km
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Puntos: Azul con opacidad para ver dónde se agrupan (densidad) */}
            <Scatter 
              name="Vehículos" 
              data={data} 
              fill="#3b82f6"      // Azul vibrante (relleno)
              fillOpacity={0.6}   // Transparencia para ver densidad
              stroke="#2563eb"    // Borde azul más oscuro (definición)
              strokeWidth={1}     // Borde fino
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MileageChart;