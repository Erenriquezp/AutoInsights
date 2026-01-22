import { useState } from 'react';
import { BarChart, TrendingUp, X } from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { BrandVolume } from '../types';

interface BrandVolumeChartProps {
  data: BrandVolume[];
}

export const BrandVolumeChart = ({ data }: BrandVolumeChartProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const total = data.reduce((acc, b) => acc + b.total, 0);

  return (
    <>
      {/* Card siempre visible */}
      <div 
        className="volume-card-collapsed"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="volume-card-title">
          <TrendingUp size={18} />
          Volumen Total de Mercado
        </div>
        <div className="volume-card-value">
          {total.toLocaleString()}
        </div>
        <div className="volume-card-subtitle">
          vehículos disponibles
        </div>
        <div className="volume-card-hint">
          <BarChart size={16} />
          Click para ver detalles por marca
        </div>
      </div>

      {/* Modal independiente */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-button"
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>
            
            <h3 className="modal-title">
              Volumen de Mercado (Top 10)
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 400 }}>
                Total: {total.toLocaleString()} vehículos
              </span>
            </h3>

            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Cantidad de vehículos disponibles por marca
            </p>

            <div style={{ height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={data}
                  layout="vertical"
                  margin={{ left: 90, right: 20, top: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="brand" width={100} />
                  <Tooltip formatter={(v) => `${Number(v || 0).toLocaleString()} autos`} />
                  <Bar dataKey="total" fill="#38bdf8" radius={[0, 8, 8, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
