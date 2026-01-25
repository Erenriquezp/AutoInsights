import { Map, BarChart4, Trophy } from 'lucide-react'; // Usaremos BarChart4 que es más "sólido"

interface HeaderProps {
  onOpenMap?: () => void;
  onOpenBrands?: () => void; // Nueva prop
}

export const Header = ({ onOpenMap, onOpenBrands }: HeaderProps) => {
  return (
    <header className="header-container">
      <div className="header-content">
        
        {/* --- NUEVO LOGO PREMIUM --- */}
        <div className="brand-section-modern">
          <div className="logo-box-glow">
            <BarChart4 size={26} color="white" strokeWidth={2.5} />
          </div>
          <div className="brand-info">
            <h1 className="brand-title">AutoInsights</h1>
            <span className="brand-subtitle">Big Data Analytics</span>
          </div>
        </div>
        {/* -------------------------- */}

        {/* Right Actions Area */}
        <div className="header-actions">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>Spark Cluster: Online</span>
          </div>

        {/* NUEVO BOTÓN: TOP BRANDS */}
          {onOpenBrands && (
            <button className="btn-header-action" onClick={onOpenBrands}>
              <Trophy size={18} />
              <span>Top Marcas</span>
            </button>
          )}

          {onOpenMap && (
            <button className="btn-header-action" onClick={onOpenMap}>
              <Map size={18} />
              <span>Ver Mapa Nacional</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;