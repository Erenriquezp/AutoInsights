import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts';
import { useState } from 'react';
import type { ConditionData } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#ef4444'];

// Renderizado personalizado para cada sector (activo o inactivo)
const renderCustomShape = (props: PieSectorDataItem & { isActive?: boolean }) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, isActive } = props;

  // Si está inactivo, renderizar sector normal
  if (!isActive) {
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="none"
      />
    );
  }

  // Si está activo, renderizar con efecto "Pop-out"
  return (
    <g>
      {/* Texto Central Dinámico */}
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#0f172a" fontWeight={700} fontSize={16}>
        {payload.condition}
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#64748b" fontSize={12}>
        {`${((percent ?? 0) * 100).toFixed(1)}%`}
      </text>

      {/* Rebanada Expandida */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // +8px más grande que las otras
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      {/* Anillo de brillo exterior */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
        fillOpacity={0.3}
      />
    </g>
  );
};

export const ConditionChart = ({ data }: { data: ConditionData[] }) => {
  // Estado para saber qué rebanada está activa
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: object, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Condición del Inventario</h3>
        <span className="chart-subtitle">Estado reportado de los vehículos</span>
      </div>
      
      <div className="chart-content-flex">
        <div style={{ width: '60%', height: 280 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                onMouseEnter={onPieEnter}       // Evento Hover
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={4}
                dataKey="count"
                stroke="none"
                shape={renderCustomShape}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda interactiva (Opacidad si no está seleccionada) */}
        <div className="custom-legend">
          {data.map((entry, index) => (
            <div 
              key={entry.condition} 
              className="legend-item"
              style={{ opacity: index === activeIndex ? 1 : 0.5, transition: 'opacity 0.3s' }} // Efecto visual
              onMouseEnter={() => setActiveIndex(index)} // También funciona al pasar mouse por la leyenda
            >
              <span 
                className="legend-dot" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></span>
              <div className="legend-text">
                <span className="legend-label">{entry.condition}</span>
                <span className="legend-value">{entry.count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConditionChart;