import { useEffect, useState } from 'react';
import { X, Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { BrandStat } from '../services/api';

interface TopBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopBrandsModal = ({ isOpen, onClose }: TopBrandsModalProps) => {
  const [brands, setBrands] = useState<BrandStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos solo cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      api.getTopBrands(10)
        .then(data => {
          setBrands(data);
          setLoading(false);
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  const maxCount = brands.length > 0 ? brands[0].count : 1;

  // Estilos dinámicos para el ranking
  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' }; // Oro
    if (index === 1) return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }; // Plata
    if (index === 2) return { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' }; // Bronce
    return { bg: 'transparent', text: '#94a3b8', border: 'none' };
  };

  const getBarColor = (index: number) => {
    if (index === 0) return 'linear-gradient(90deg, #eab308, #ca8a04)';
    if (index === 1) return 'linear-gradient(90deg, #94a3b8, #64748b)';
    if (index === 2) return 'linear-gradient(90deg, #f97316, #c2410c)';
    return '#cbd5e1';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content map-modal" style={{ maxWidth: '600px', height: 'auto', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        
        {/* Header del Modal */}
        <div className="modal-header">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#0f172a' }}>
              <Trophy size={24} className="text-yellow" color="#eab308" />
              Líderes del Mercado
            </h2>
            <p style={{ margin: '4px 0 0 34px', fontSize: '0.9rem', color: '#64748b' }}>
              Top 10 marcas por volumen de inventario disponible.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {/* Contenido de la Lista */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', marginTop: '1rem' }}>
          {loading ? (
            <div className="loading-container full-center" style={{ minHeight: '300px' }}>
              <Loader2 className="spinner" />
              <p>Calculando líderes...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {brands.map((item, index) => {
                const style = getRankStyle(index);
                return (
                  <div key={item.manufacturer} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    
                    {/* 1. Badge de Ranking */}
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.9rem',
                      backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`,
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>

                    {/* 2. Info y Barra (Aquí estaba el problema, forzamos flex-grow) */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                        {/* NOMBRE DE LA MARCA: Forzamos color oscuro y negrita */}
                        <span style={{ 
                          fontWeight: 700, 
                          color: '#1e293b', 
                          textTransform: 'uppercase', 
                          fontSize: '0.95rem' 
                        }}>
                          {item.manufacturer || "Desconocido"} 
                        </span>
                        
                        {/* Cantidad */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#64748b' }}>
                            {item.count.toLocaleString()}
                          </span>
                          {index === 0 && <TrendingUp size={14} color="#eab308" />}
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${(item.count / maxCount) * 100}%`, 
                          height: '100%', 
                          background: getBarColor(index),
                          borderRadius: '4px'
                        }}></div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};