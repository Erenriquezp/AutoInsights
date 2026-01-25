import React from 'react';
import { Chart } from "react-google-charts";
// Asegúrate de importar el tipo correcto si lo tienes definido, o usa any[][]
import type { GoogleChartData } from '../types/mapTypes'; 

interface MapViewProps {
  data: GoogleChartData;
}

export const MapView: React.FC<MapViewProps> = ({ data }) => {
  const options = {
    region: "US",
    displayMode: "regions",
    resolution: "provinces",
    colorAxis: { colors: ["#dbeafe", "#1e40af"] }, // Azul claro -> Azul fuerte
    backgroundColor: "#f8fafc", // Coincide con el fondo del contenedor
    datalessRegionColor: "#e2e8f0", // Gris suave para estados sin datos
    defaultColor: "#f5f5f5",
    legend: 'none', // Ocultamos la leyenda por defecto de Google para usar la nuestra personalizada
    tooltip: { 
      showColorCode: true, 
      isHtml: true, 
      trigger: 'focus',
      textStyle: { fontName: 'sans-serif' }
    } 
  };

  return (
    <div className="map-wrapper" style={{ width: "100%", height: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <Chart
        chartType="GeoChart"
        width="100%"
        height="100%" // Importante: llena el contenedor padre
        data={data}
        options={options}
        chartEvents={[
          {
            eventName: "ready",
            callback: () => {
              // Opcional: Ajustes finales al cargar
            },
          },
        ]}
      />
    </div>
  );
};