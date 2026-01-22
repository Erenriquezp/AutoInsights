import { Car } from 'lucide-react';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <Car size={32} color="#ffffff" />
          AutoInsights <span>Big Data Analytics</span>
        </h1>
      </div>
    </header>
  );
};
