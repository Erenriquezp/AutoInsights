import React from 'react';
import { Chart } from "react-google-charts";
import type { GoogleChartData } from '../types/mapTypes';

interface MapViewProps {
  data: GoogleChartData;
}

export const MapView: React.FC<MapViewProps> = ({ data }) => {
  const options = {
    region: "US", // Solo USA
    displayMode: "regions",
    resolution: "provinces", // Nivel estatal
    colorAxis: { colors: ["#dbeafe", "#1e40af"] }, // Gradiente Azul
    backgroundColor: "#ffffff",
    datalessRegionColor: "#f1f5f9",
    defaultColor: "#f5f5f5",
    legend: { textStyle: { color: '#64748b', fontSize: 12 } },
    tooltip: { showColorCode: true, isHtml: true, trigger: 'focus' } 
  };

  return (
    <div className="map-wrapper" style={{ width: "100%", height: "100%", minHeight: "500px", borderRadius: "12px", overflow: "hidden" }}>
      <Chart
        chartType="GeoChart"
        width="100%"
        height="500px"
        data={data}
        options={options}
      />
    </div>
  );
};