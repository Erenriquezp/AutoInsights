import { DollarSign, Activity, TrendingDown } from 'lucide-react';
import type { KPIData } from '../types';

interface KPICardsProps {
  kpis: KPIData;
}

export const KPICards = ({ kpis }: KPICardsProps) => {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-title">
          <DollarSign size={16} style={{ display: 'inline' }} /> Precio Promedio
        </div>
        <div className="kpi-value">${kpis.avg_price.toLocaleString()}</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-title">
          <Activity size={16} style={{ display: 'inline' }} /> Muestras Analizadas
        </div>
        <div className="kpi-value">{kpis.total_samples} autos</div>
      </div>

      <div className="kpi-card" style={{ borderLeftColor: '#ef4444' }}>
        <div className="kpi-title">
          <TrendingDown size={16} style={{ display: 'inline' }} /> Tendencia Histórica
        </div>
        <div className="kpi-value" style={{ color: '#ef4444' }}>{kpis.trend}</div>
      </div>
    </div>
  );
};
