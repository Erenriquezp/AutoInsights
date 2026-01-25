import { Car, Tags, DollarSign, CalendarRange } from 'lucide-react';
import type { MarketStats } from '../types';

interface GlobalMarketStatsProps {
  stats: MarketStats | null;
  loading: boolean;
}

export const GlobalMarketStats = ({ stats, loading }: GlobalMarketStatsProps) => {
  if (loading) {
    return (
      <div className="stats-grid-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card skeleton"></div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Datos estructurados para iterar
  const items = [
    {
      label: "Vehículos Analizados",
      value: stats.total_vehicles.toLocaleString(),
      icon: <Car size={22} />,
      color: "blue",
      sub: "Total en Base de Datos"
    },
    {
      label: "Marcas / Modelos",
      value: `${stats.total_brands} / ${stats.total_models}`,
      icon: <Tags size={22} />,
      color: "purple",
      sub: "Diversidad de Catálogo"
    },
    {
      label: "Precio Promedio",
      value: `$${stats.avg_market_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: <DollarSign size={22} />,
      color: "green",
      sub: "Media del Mercado Global"
    },
    {
      label: "Rango Histórico",
      value: `${stats.oldest_year} - ${stats.newest_year}`,
      icon: <CalendarRange size={22} />,
      color: "orange",
      sub: "Años Contemplados"
    }
  ];

  return (
    <div className="stats-grid">
      {items.map((item, index) => (
        <div key={index} className={`stat-card border-${item.color}`}>
          <div className={`stat-icon bg-${item.color}`}>
            {item.icon}
          </div>
          <div className="stat-content">
            <span className="stat-label">{item.label}</span>
            <span className="stat-value">{item.value}</span>
            <span className="stat-sub">{item.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalMarketStats;