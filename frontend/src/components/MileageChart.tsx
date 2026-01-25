import { Gauge } from 'lucide-react'; // Icono de tacómetro/medidor
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
    <div className="chart-container" style={{ width: '100%', height: 'auto', minHeight: '400px' }}>
      
      {/* --- 1. ENCABEZADO PROFESIONAL --- */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          Impacto del Kilometraje en el Precio
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
          <Gauge size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          Cada punto representa un vehículo real vendido.
          <span style={{ display: 'block', marginTop: '4px', fontStyle: 'italic', fontSize: '0.8rem', color: '#94a3b8' }}>
             Observa cómo el precio (vertical) tiende a caer a medida que aumenta el uso (horizontal).
          </span>
        </p>
      </div>

      {/* --- 2. GRÁFICA DE DISPERSIÓN --- */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            
            {/* Eje X: Kilometraje */}
            <XAxis 
              type="number" 
              dataKey="odometer" 
              name="Kilometraje" 
              unit="km"
              // Formato más limpio: "50k", "100k"
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              tick={{ fill: '#64748b', fontSize: 12 }}
            >
              <Label value="Kilometraje Acumulado" offset={0} position="insideBottom" style={{ fill: '#94a3b8', fontSize: '0.8rem' }} />
            </XAxis>
            
            {/* Eje Y: Precio */}
            <YAxis 
              type="number" 
              dataKey="price" 
              name="Precio" 
              unit="$"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            
            {/* Tooltip oscuro y elegante */}
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="custom-tooltip" style={{ 
                      backgroundColor: '#1e293b', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '1px solid #475569',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <p style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '0.9rem' }}>
                        Precio: <strong style={{ color: '#38bdf8' }}>${data.price.toLocaleString()}</strong>
                      </p>
                      <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                        Uso: <strong>{data.odometer.toLocaleString()} km</strong>
                      </p>
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
              fill="#3b82f6" 
              fillOpacity={0.5} 
              line={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MileageChart;