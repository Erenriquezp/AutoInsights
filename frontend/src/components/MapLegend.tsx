import React from 'react';

export const MapLegend: React.FC = () => {
  return (
    <div className="map-legend">
      <span className="legend-item">
        <span className="dot" style={{ background: '#dbeafe' }}></span>
        Bajo
      </span>
      <span className="legend-item">
        <span className="dot" style={{ background: '#1e40af' }}></span>
        Alto Volumen
      </span>
    </div>
  );
};
