import { Car } from 'lucide-react';

export const Header = () => {
  return (
    <header className="header">
      <h1>
        <Car size={32} color="#2563eb" />
        AutoInsights <span style={{ fontWeight: 300, color: '#64748b' }}>Big Data Analytics</span>
      </h1>
    </header>
  );
};
