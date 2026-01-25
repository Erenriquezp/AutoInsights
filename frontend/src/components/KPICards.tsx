import { 
  DollarSign, 
  Activity, 
  TrendingDown, 
  TrendingUp 
} from 'lucide-react';

import type { KPISummary } from '../types';

interface KPICardsProps {
  summary: KPISummary;
  vehicleName: string;
}

export const KPICards = ({ summary, vehicleName }: KPICardsProps) => {
  // Lógica para determinar el "sentimiento" del dato
  // Si la depreciación es > 0, el valor baja (Flecha Abajo) -> Color Naranja/Rojo
  // Si la depreciación es < 0, el valor sube (Apreciación) -> Color Verde
  const isDepreciating = summary.depreciation_value > 0;
  
  return (
    <div className="kpi-grid-container">
      
      {/* TARJETA 1: PRECIO PROMEDIO (Financiero) */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper bg-green-soft">
          <DollarSign size={24} className="text-green" />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Precio Promedio de Mercado</span>
          <span className="kpi-value">
            ${summary.avg_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="kpi-subtext">Valor medio para {vehicleName}</span>
        </div>
      </div>

      {/* TARJETA 2: VOLUMEN DE DATOS (Credibilidad) */}
      <div className="kpi-card">
        <div className="kpi-icon-wrapper bg-blue-soft">
          <Activity size={24} className="text-blue" />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Muestras Analizadas</span>
          <span className="kpi-value">
            {summary.total_samples.toLocaleString()}
          </span>
          <span className="kpi-subtext">Vehículos únicos en Base de Datos</span>
        </div>
      </div>

      {/* TARJETA 3: DEPRECIACIÓN (La Protagonista) */}
      {/* Le damos una clase especial 'highlight-card' */}
      <div className={`kpi-card highlight-card ${isDepreciating ? 'trend-down' : 'trend-up'}`}>
        <div className="kpi-header-row">
          <div className="kpi-icon-wrapper trend-icon">
            {isDepreciating ? <TrendingDown size={28} /> : <TrendingUp size={28} />}
          </div>
          <div className="badge">
            {isDepreciating ? 'Pérdida de Valor' : 'Activo en Apreciación'}
          </div>
        </div>
        
        <div className="kpi-content">
          <span className="kpi-label-highlight">
            {isDepreciating ? 'Depreciación Estimada' : 'Apreciación Histórica'}
          </span>
          <div className="kpi-value-row">
            <span className="kpi-value-huge">
              {Math.abs(summary.depreciation_value).toFixed(1)}%
            </span>
            <span className="kpi-unit">total</span>
          </div>
          <p className="kpi-explanation">
            {isDepreciating 
              ? 'Caída de valor desde el modelo más nuevo al más antiguo.'
              : 'Incremento de valor por rareza o estatus de clásico.'}
          </p>
        </div>
      </div>

    </div>
  );
};

export default KPICards;