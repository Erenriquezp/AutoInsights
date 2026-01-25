import { useMemo } from 'react';
import { X, Map as Trophy, TrendingUp } from 'lucide-react';
import { useMapData } from '../hooks/useMapData';
import { MapView } from './MapView';
import { MapLoadingState } from './MapLoadingState';

interface USAMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export const USAMap = ({ isOpen, onClose }: USAMapProps) => {
  // 1. Usamos tu Hook existente
  const { data, loading, error } = useMapData(isOpen);

  // 2. Lógica para extraer el Top 5 desde la data de Google Charts
  // La data viene así: [['State', 'Count', 'Price'], ['US-CA', 5000, 20000], ...]
  const topStates = useMemo(() => {
    if (!data || data.length <= 1) return [];

    // Ignoramos la cabecera (slice 1), ordenamos por Count (índice 1) y tomamos 5
    const sorted = [...data.slice(1)].sort((a, b) => (b[1] as number) - (a[1] as number));
    
    return sorted.slice(0, 5).map(row => ({
      code: (row[0] as string).replace('US-', ''), // Quitamos el prefijo para mostrar solo 'CA'
      count: row[1] as number,
      price: row[2] as number
    }));
  }, [data]);

  // Cálculo del porcentaje de concentración (Insight)
  const concentrationText = useMemo(() => {
    if (data.length <= 1 || topStates.length === 0) return '';
    const totalVolume = data.slice(1).reduce((acc, curr) => acc + (curr[1] as number), 0);
    const topVolume = topStates.reduce((acc, curr) => acc + curr.count, 0);
    const percent = Math.round((topVolume / totalVolume) * 100);
    return `${percent}% del inventario nacional.`;
  }, [data, topStates]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content map-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header Mejorado */}
        <div className="modal-header">
          <div>
            {/* AGREGAMOS LA CLASE 'modal-title-flex' AQUÍ */}
            <h2 className="modal-title-flex">
              <img 
                src="/logo/logo autoinsights.png" 
                alt="AutoInsights Logo" 
                className="header-logo" 
              />
              <span className="title-text">Mapa de Calor: Concentración de Inventario</span>
            </h2>
            
            {/* Ajustamos el padding-left para que se alinee con el texto, no con el logo */}
            <p style={{ margin: '4px 0 0 0', paddingLeft: '65px', fontSize: '0.9rem', color: '#64748b' }}>
              Visualiza las mayores oportunidades de compra por región.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Contenido Principal con Grid */}
        <div className="map-layout-grid" style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
             <div className="full-center" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <MapLoadingState />
             </div>
          ) : error ? (
             <div className="error-state" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', width: '100%' }}>
               <p>{error}</p>
             </div>
          ) : data.length <= 1 ? (
            <div className="empty-state" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', width: '100%' }}>
              <p>No se encontraron datos de inventario.</p>
            </div>
          ) : (
            <>
              {/* COLUMNA IZQUIERDA: EL MAPA */}
              <div className="map-visual-area">
                <MapView data={data} />
                
                {/* Leyenda Flotante */}
                <div className="map-legend-hint">
                  <span className="dot-light"></span> Menor
                  <span className="gradient-line"></span>
                  <span className="dot-dark"></span> Mayor Oferta
                </div>
              </div>

              {/* COLUMNA DERECHA: SIDEBAR DE DATOS */}
              <div className="map-sidebar">
                <div className="sidebar-header">
                  <Trophy size={18} className="text-yellow" />
                  <h3>Top 5 Mercados</h3>
                </div>
                
                <div className="top-states-list">
                  {topStates.map((state, index) => (
                    <div key={state.code} className="state-item">
                      {/* Ranking Badge */}
                      <div className="state-rank">{index + 1}</div>
                      
                      {/* Info Estado */}
                      <div className="state-info">
                        <span className="state-name">{state.code}</span>
                        <span className="state-price-sub">Avg: ${state.price.toLocaleString()}</span>
                      </div>
                      
                      {/* Volumen */}
                      <div className="state-volume">
                        <span className="vol-num">{state.count.toLocaleString()}</span>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                           <TrendingUp size={12} color="#10b981" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sidebar-footer">
                  <p>
                    <strong>Insight:</strong> Estos 5 estados concentran el 
                    <strong> {concentrationText}</strong>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default USAMap;