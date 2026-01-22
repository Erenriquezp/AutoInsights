# Arquitectura del Proyecto AutoInsights

## 📁 Estructura de Carpetas

### `/types`
- **index.ts**: Interfaces TypeScript que definen la estructura de datos (AnalysisData, KPIData, BrandVolume, MileageDataPoint, HistoryDataPoint)

### `/services`
- **api.ts**: Centraliza todas las llamadas HTTP a la API FastAPI (getBrands, getModels, getAnalysis, getMileageData, getBrandVolume)

### `/hooks`
- **useVehicleSelector.ts**: Maneja la lógica de selección de marca y modelo (carga marcas, modelos dinámicos)
- **useAnalysis.ts**: Gestiona el análisis de vehículos (llama a la API, maneja loading/error)
- **useBrandVolume.ts**: Obtiene y procesa datos de volumen por marca (incluye top 10)

### `/components`
- **Header.tsx**: Encabezado de la aplicación con logo y título
- **VehicleSelector.tsx**: Selectores desplegables para marca y modelo + botón de análisis
- **KPICards.tsx**: Tarjetas de indicadores clave (precio promedio, muestras, tendencia)
- **PriceChart.tsx**: Gráfico de línea mostrando precio promedio por año
- **VolumeChart.tsx**: Gráfico de barras con volumen de autos por año
- **MileageChart.tsx**: Gráfico de dispersión precio vs kilometraje
- **BrandVolumeChart.tsx**: Gráfico de barras horizontal con top 10 marcas

### `/src`
- **App.tsx**: Componente principal que orquesta todos los componentes y hooks (simplificado de 278 a 78 líneas)

## 🎯 Principios Aplicados

- **Separación de responsabilidades**: Cada módulo tiene una función específica
- **Reutilización**: Componentes y hooks independientes
- **Tipado fuerte**: TypeScript con interfaces claras
- **Mantenibilidad**: Código limpio y fácil de modificar
