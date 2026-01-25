import { Loader2 } from 'lucide-react';

export const MapLoadingState = () => (
  <div className="loading-map" style={{ 
    height: '500px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: '#3b82f6' 
  }}>
    <Loader2 className="spinner" size={48} style={{ animation: 'spin 1s linear infinite' }} />
    <p style={{ marginTop: '1rem', color: '#64748b' }}>Procesando datos geoespaciales...</p>
    
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);