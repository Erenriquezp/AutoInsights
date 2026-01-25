// src/components/GlobalMarketStats.tsx
import React from 'react';
import type { MarketStats } from '../types';

interface Props {
  stats: MarketStats | null;
  loading: boolean;
}

const GlobalMarketStats: React.FC<Props> = ({ stats, loading }) => {
  if (loading || !stats) return <div className="stats-loading">Cargando datos del mercado...</div>;

  return (
    <div className="global-stats-container">
      <div className="stat-card">
        <h3>Vehículos Analizados</h3>
        <p className="stat-number">{stats.total_vehicles.toLocaleString()}</p>
      </div>
      
      <div className="stat-card">
        <h3>Marcas / Modelos</h3>
        <p className="stat-number">{stats.total_brands} / {stats.total_models}</p>
      </div>

      <div className="stat-card">
        <h3>Precio Promedio Mercado</h3>
        <p className="stat-number">
            ${stats.avg_market_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>

      <div className="stat-card">
        <h3>Rango Histórico</h3>
        <p className="stat-number">{stats.oldest_year} - {stats.newest_year}</p>
      </div>
    </div>
  );
};

export default GlobalMarketStats;