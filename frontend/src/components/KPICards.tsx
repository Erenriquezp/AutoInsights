import { DollarSign, Activity, TrendingDown, TrendingUp } from 'lucide-react';

// Definimos la interfaz parcial que necesitamos aquí
interface KPISummary {
  avg_price: number;
  total_samples: number;
  depreciation_text: string;
  depreciation_value: number; // Nuevo campo numérico para lógica de color
}

interface KPICardsProps {
  summary: KPISummary;
  vehicleName: string;
}

export const KPICards = ({ summary, vehicleName }: KPICardsProps) => {
  // Lógica de color para la depreciación
  // Si la depreciación es alta (>0), es "malo" para el valor (rojo)
  const isHighDepreciation = summary.depreciation_value > 0;
  
  return (
    <div className="kpi-grid">
      {/* Tarjeta 1: Precio Promedio */}
      <div className="kpi-card">
        <div className="kpi-title">
          <DollarSign size={16} /> Precio Promedio Histórico
        </div>
        <div className="kpi-value">
          ${summary.avg_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="kpi-subtitle">
          Promedio global para {vehicleName}
        </div>
      </div>

      {/* Tarjeta 2: Muestras */}
      <div className="kpi-card">
        <div className="kpi-title">
          <Activity size={16} /> Data Points Analizados
        </div>
        <div className="kpi-value">
          {summary.total_samples.toLocaleString()}
        </div>
        <div className="kpi-subtitle">
          Vehículos únicos en la base de datos
        </div>
      </div>

      {/* Tarjeta 3: Tendencia */}
      <div className="kpi-card" style={{ borderLeftColor: isHighDepreciation ? '#ef4444' : '#10b981' }}>
        <div className="kpi-title">
          {isHighDepreciation ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
          Depreciación Estimada
        </div>
        <div 
          className="kpi-value" 
          style={{ color: isHighDepreciation ? '#ef4444' : '#10b981' }}
        >
          {summary.depreciation_text}
        </div>
        <div className="kpi-subtitle">
          Caída desde modelo más nuevo al más viejo
        </div>
      </div>
    </div>
  );
};

export default KPICards;