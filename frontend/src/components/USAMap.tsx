import { X, Map as MapIcon } from 'lucide-react';
import { useMapData } from '../hooks/useMapData';
import { MapView } from './MapView';
import { MapLoadingState } from './MapLoadingState';

interface USAMapProps {
  isOpen: boolean;
  onClose: () => void;
}

export const USAMap = ({ isOpen, onClose }: USAMapProps) => {
  // 1. Usamos el Hook para traer la data
  const { data, loading, error } = useMapData(isOpen);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content map-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapIcon size={24} color="#3b82f6" />
            Inventario Nacional
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Contenido Dinámico */}
        <div className="map-container-inner">
          {loading ? (
            <MapLoadingState />
          ) : error ? (
             <div className="error-state" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
               <p>{error}</p>
             </div>
          ) : data.length <= 1 ? ( // <= 1 porque la cabecera cuenta como 1 fila
            <div className="empty-state" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
              <p>No se encontraron datos de inventario para mostrar en el mapa.</p>
            </div>
          ) : (
            <>
              {/* Renderizamos el Mapa */}
              <MapView data={data} />
              
              {/* Nota al pie */}
              <div className="map-footnote" style={{ 
                marginTop: '1rem', 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                color: '#64748b',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '1rem'
              }}>
                * La intensidad del color representa el volumen de vehículos. Pasa el cursor sobre un estado para ver detalles.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default USAMap;