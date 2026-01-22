import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { BrandVolume } from '../types';

export const useBrandVolume = () => {
  const [brandVolume, setBrandVolume] = useState<BrandVolume[]>([]);

  useEffect(() => {
    apiService.getBrandVolume()
      .then(data => setBrandVolume(data))
      .catch(err => console.error("Error cargando volumen por marca:", err));
  }, []);

  const top10Brands = brandVolume
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return { brandVolume, top10Brands };
};
