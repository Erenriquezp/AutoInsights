import { Info } from 'lucide-react'; // Asegúrate de tener lucide-react instalado
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartDataPoint {
  year: number;
  avg_price: number;
  count: number;
}

interface PriceChartProps {
  data: ChartDataPoint[];
}

export const PriceChart = ({ data }: PriceChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container flex items-center justify-center" style={{ height: '350px' }}>
        <p style={{ color: '#94a3b8' }}>No hay datos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ width: '100%', height: 'auto', minHeight: '350px' }}>
      
      {/* --- NUEVO ENCABEZADO --- */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          Precio de Mercado por Año
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
          <Info size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          Muestra cuánto cuesta comprar este vehículo usado <strong>hoy</strong>, según su año de fabricación.
        </p>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis 
              tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              width={60}
              domain={[0, 'auto']} // Fuerza a empezar en 0 para ver la escala real
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#fff' }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString()}`, "Precio Promedio"]}
              labelFormatter={(label) => `Modelo Año: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="avg_price" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;