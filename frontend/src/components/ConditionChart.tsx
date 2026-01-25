import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ConditionData } from '../types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#64748b', '#8b5cf6'];

export const ConditionChart = ({ data }: { data: ConditionData[] }) => {
  return (
    <div className="chart-wrapper">
      <h3>Condición de los Vehículos</h3>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
        Calidad del inventario analizado
      </p>
      
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60} // Efecto Donut
              outerRadius={80}
              paddingAngle={5}
              dataKey="count"
              nameKey="condition"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number | undefined) => [value?.toLocaleString() ?? '', 'Vehículos']}
              contentStyle={{ color: '#fff', backgroundColor: '#1e293b', borderColor: '#475569' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ConditionChart;