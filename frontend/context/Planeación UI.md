# AutoInsights - Planeación UI/UX

## 📋 Índice
1. [Visión General](#visión-general)
2. [Estructura de la Aplicación](#estructura-de-la-aplicación)
3. [Componentes Principales](#componentes-principales)
4. [Arquitectura y Organización](#arquitectura-y-organización)
5. [Flujo de Trabajo y Datos](#flujo-de-trabajo-y-datos)
6. [Sistema de Filtros](#sistema-de-filtros)
7. [KPIs y Gráficas](#kpis-y-gráficas)
8. [Top Sugerencias](#top-sugerencias)
9. [Separación de Responsabilidades](#separación-de-responsabilidades)
10. [Buenas Prácticas](#buenas-prácticas)

---

## 🎯 Visión General

### Objetivo
Crear un dashboard interactivo y profesional para análisis del mercado automotriz que permita visualizar tendencias, comparar vehículos y obtener insights valiosos mediante filtros dinámicos y visualizaciones claras.

### Tecnologías Stack
- **Framework**: React 18+ con TypeScript
- **Build Tool**: Vite
- **Estado Global**: Context API o Zustand
- **Gráficas**: Recharts o Chart.js
- **Estilos**: Tailwind CSS o CSS Modules
- **UI Components**: Shadcn/ui, Material-UI o componentes personalizados
- **Iconos**: Lucide React o React Icons
- **Validación**: Zod (opcional para datos)

---

## 🏗️ Estructura de la Aplicación

### Layout Principal

```
┌─────────────────────────────────────────────────┐
│         Navbar (Glassmorphism)                  │
│   Logo | Dashboard | Análisis | Reportes | 🔍  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Hero / Header Section              │
│         "AutoInsights - Market Analytics"       │
│              Breadcrumbs (opcional)             │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Filtros en Cascada                 │
│  Manufacturer | Model | Type | Color | etc.    │
└─────────────────────────────────────────────────┘
┌──────────────┬──────────────┬──────────────────┐
│  Card KPI    │  Card KPI    │    Card KPI      │
│ Total Veh.   │  Condición   │    Type          │
├──────────────┼──────────────┼──────────────────┤
│  Card KPI    │  Card KPI    │                  │
│   Drive      │ Transmission │                  │
└──────────────┴──────────────┴──────────────────┘
┌─────────────────────────────────────────────────┐
│            Sección de Gráficas                  │
│  ┌─────────────────┬─────────────────────────┐  │
│  │  Gráfica 1      │    Gráfica 2            │  │
│  │  (Precios)      │    (Distribución)       │  │
│  └─────────────────┴─────────────────────────┘  │
│  ┌─────────────────┬─────────────────────────┐  │
│  │  Gráfica 3      │    Gráfica 4            │  │
│  │  (Tendencias)   │    (Comparativas)       │  │
│  └─────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│          Top Sugerencias / Insights             │
│  Cards con recomendaciones inteligentes         │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│              Footer (opcional)                  │
│        © 2026 AutoInsights | Contacto           │
└─────────────────────────────────────────────────┘
```

---

## 🧩 Componentes Principales

### 1. Navegación

#### `Navbar`
- **Responsabilidad**: Navegación principal con efecto glassmorphism
- **Props**: `currentRoute`, `onNavigate`, `user`
- **Estado interno**: `isMenuOpen` (mobile)
- **Características**:
  - Fixed position con backdrop-filter
  - Logo clickeable (vuelve al inicio)
  - Links de navegación con estado activo
  - Responsive (hamburger menu en mobile)
  - Avatar de usuario con dropdown

#### `Breadcrumbs` (opcional)
- **Responsabilidad**: Mostrar ruta de navegación actual
- **Props**: `path[]`
- **Ubicación**: Debajo del navbar o en header section

### 2. Sección de Filtros

#### `FilterBar`
- **Responsabilidad**: Contenedor de todos los filtros en cascada
- **Props**: `onFilterChange`, `availableFilters`, `selectedFilters`
- **Características**:
  - Grid responsive (wrap en mobile)
  - Clear all filters button
  - Indicador visual de filtros activos

#### `CascadeFilter` (componente reutilizable)
- **Responsabilidad**: Dropdown individual con cascada
- **Props**: `label`, `options`, `value`, `onChange`, `disabled`, `dependsOn`
- **Estado interno**: `isOpen`, `searchTerm`
- **Características**:
  - Búsqueda interna (si +10 opciones)
  - Placeholder con contador de opciones
  - Disabled cuando depende de filtro no seleccionado
  - Clear button individual
  - Loading state

**Filtros a implementar:**
1. **Manufacturer** (independiente)
2. **Model** (depende de Manufacturer)
3. **Type** (independiente: sedan, SUV, truck, etc.)
4. **Paint Color** (independiente)
5. **Drive** (independiente: 4wd, fwd, rwd)
6. **Transmission** (independiente: automatic, manual)

#### Lógica de Cascada
```
Manufacturer seleccionado 
  ↓
Filtra Models disponibles
  ↓
Ambos afectan el dataset final
  ↓
Todos los demás filtros independientes
```

### 3. Cards KPI

#### `KPICard` (componente base reutilizable)
- **Responsabilidad**: Mostrar métrica única con diseño consistente
- **Props**: `title`, `value`, `icon`, `trend`, `color`, `subtitle`
- **Variantes**: 
  - Simple (solo valor)
  - Con tendencia (flecha arriba/abajo + porcentaje)
  - Con gráfico pequeño (sparkline)
- **Características**:
  - Animación al cargar (counter animation)
  - Tooltip con información adicional
  - Responsive (stack en mobile)
  - Loading skeleton

**Cards específicas:**

##### `TotalVehiclesCard`
- Muestra: Total de vehículos filtrados
- Ícono: 🚗 Car
- Comparación: vs total en dataset
- Subtítulo: "Vehículos disponibles"

##### `ConditionCard`
- Muestra: Distribución de condiciones (nuevo/usado/etc.)
- Ícono: ⭐ Star
- Puede ser: Mini pie chart o lista con porcentajes
- Subtítulo: "Estado promedio"

##### `TypeCard`
- Muestra: Tipos más comunes (sedan, SUV, truck)
- Ícono: 📊 BarChart
- Puede ser: Top 3 con barras horizontales
- Subtítulo: "Categorías principales"

##### `DriveCard`
- Muestra: Distribución de tracciones (4wd, fwd, rwd)
- Ícono: 🔧 Settings
- Formato: Porcentajes con mini badges
- Subtítulo: "Sistemas de tracción"

##### `TransmissionCard`
- Muestra: Automatic vs Manual (ratio)
- Ícono: ⚙️ Gear
- Formato: Gauge chart o porcentaje
- Subtítulo: "Tipos de transmisión"

### 4. Sección de Gráficas

#### `ChartGrid`
- **Responsabilidad**: Contenedor grid de gráficas
- **Props**: `charts[]`, `layout`
- **Características**:
  - Grid responsive (2 cols desktop, 1 col mobile)
  - Lazy loading de gráficas
  - Loading skeletons

#### `ChartCard`
- **Responsabilidad**: Wrapper para cada gráfica individual
- **Props**: `title`, `description`, `children`, `actions`
- **Características**:
  - Header con título y botones de acción
  - Export button (PNG, CSV)
  - Fullscreen mode
  - Refresh data

**Gráficas a implementar:**

##### 1. `PriceDistributionChart`
- **Tipo**: Histograma o Box Plot
- **Eje X**: Rangos de precio ($0-10k, $10k-20k, etc.)
- **Eje Y**: Cantidad de vehículos
- **Insights**: Precio promedio, mediana, outliers
- **Interactividad**: Hover para ver detalles, click para filtrar rango

##### 2. `YearVsPriceChart`
- **Tipo**: Scatter plot o Line chart
- **Eje X**: Año del vehículo
- **Eje Y**: Precio promedio
- **Color**: Por manufacturer o type
- **Insights**: Depreciación por año
- **Interactividad**: Tooltip con detalles, zoom

##### 3. `TopManufacturersChart`
- **Tipo**: Bar chart horizontal
- **Datos**: Top 10 fabricantes por cantidad de vehículos
- **Color coding**: Por marca
- **Insights**: Market share
- **Interactividad**: Click para filtrar por manufacturer

##### 4. `FuelTypeDistributionChart`
- **Tipo**: Donut chart o Pie chart
- **Datos**: Distribución de tipos de combustible (gas, diesel, electric, hybrid)
- **Insights**: Porcentajes y tendencia hacia eléctricos
- **Interactividad**: Click en segmento para filtrar

##### 5. `OdometerByYearChart`
- **Tipo**: Line chart con banda de confianza
- **Eje X**: Año del vehículo
- **Eje Y**: Kilometraje promedio
- **Insights**: Uso promedio anual
- **Interactividad**: Hover para rangos

##### 6. `RegionalPriceHeatmap` (opcional avanzado)
- **Tipo**: Heatmap geográfico
- **Datos**: Precio promedio por estado/región
- **Color**: Escala de precios (rojo=caro, verde=barato)
- **Insights**: Variación regional de precios

##### 7. `ConditionVsPriceChart`
- **Tipo**: Box plot o Violin plot
- **Eje X**: Condiciones (excellent, good, fair, salvage)
- **Eje Y**: Distribución de precios
- **Insights**: Impacto de condición en precio

##### 8. `MonthlyPostingTrendChart`
- **Tipo**: Area chart o Line chart
- **Eje X**: Fecha de publicación (agrupado por mes)
- **Eje Y**: Cantidad de anuncios publicados
- **Insights**: Estacionalidad del mercado

### 5. Top Sugerencias / Insights

#### `InsightsSection`
- **Responsabilidad**: Contenedor de sugerencias inteligentes
- **Props**: `insights[]`, `isLoading`
- **Layout**: Grid de 3 columnas (1 en mobile)

#### `InsightCard`
- **Responsabilidad**: Card individual de sugerencia
- **Props**: `type`, `title`, `description`, `data`, `action`
- **Tipos de insights**:
  - `recommendation`: Sugerencia de compra
  - `trend`: Tendencia detectada
  - `alert`: Alerta de precio
  - `comparison`: Comparativa destacada

**Sugerencias Inteligentes a Implementar:**

##### 1. 💰 **Mejor Relación Calidad-Precio**
- **Lógica**: Vehículos con precio por debajo del promedio de su categoría
- **Criterios**: 
  - Condición "excellent" o "good"
  - Precio < (precio promedio del mismo modelo/año - 15%)
  - Kilometraje < promedio
- **Mostrar**: 
  - Top 3 vehículos
  - % de ahorro vs mercado
  - Link para ver detalles

##### 2. 📈 **Vehículos con Mejor Retención de Valor**
- **Lógica**: Modelos que mantienen precio alto a pesar de los años
- **Criterios**:
  - Comparar precio actual vs precio esperado por depreciación
  - Manufacturers premium (Toyota, Honda, Lexus históricamente retienen valor)
- **Mostrar**:
  - Top 3-5 modelos
  - % de retención de valor
  - Gráfico mini de depreciación

##### 3. 🔥 **Tendencias del Mes**
- **Lógica**: Cambios significativos en el mercado
- **Criterios**:
  - Tipos de vehículos más buscados (más postings recientes)
  - Cambios en precios promedio (+/- 5%)
  - Nuevos modelos populares
- **Mostrar**:
  - 2-3 tendencias principales
  - Indicador de cambio (↑↓)
  - Descripción breve

##### 4. 🚗 **Oportunidades por Región**
- **Lógica**: Precios más bajos en ciertas regiones
- **Criterios**:
  - Mismo modelo/año con variación de precio > 20% entre regiones
  - Disponibilidad de inventario
- **Mostrar**:
  - Región con mejor precio
  - Comparativa de precio
  - Distancia estimada (si tiene lat/long)

##### 5. ⚡ **Vehículos Eléctricos/Híbridos en Alza**
- **Lógica**: Análisis de vehículos eco-friendly
- **Criterios**:
  - Filtro por fuel type (electric, hybrid)
  - Comparar disponibilidad mes actual vs anterior
  - Tendencia de precios
- **Mostrar**:
  - % de crecimiento en listings
  - Precio promedio vs combustión
  - Modelos destacados

##### 6. 🏆 **Manufacturers Confiables**
- **Lógica**: Fabricantes con mejor oferta en el mercado actual
- **Criterios**:
  - Mayor cantidad de vehículos en "excellent/good" condition
  - Precio competitivo
  - Disponibilidad de inventario
- **Mostrar**:
  - Top 3 manufacturers
  - Rating visual (estrellas)
  - Cantidad de unidades disponibles

##### 7. ⏰ **Publicaciones Recientes**
- **Lógica**: Anuncios nuevos (últimos 7 días)
- **Criterios**:
  - posting_date reciente
  - Filtrado por criterios actuales del usuario
- **Mostrar**:
  - "X nuevos vehículos publicados esta semana"
  - Quick preview cards
  - Botón "Ver todos los nuevos"

##### 8. 📊 **Tu Perfil de Búsqueda**
- **Lógica**: Resumen de lo que el usuario está buscando
- **Basado en**: Filtros activos
- **Mostrar**:
  - "Estás buscando: [Manufacturer] [Model] [Type]"
  - Rango de precio más común en esos filtros
  - "X vehículos coinciden con tu búsqueda"
  - Sugerencia para ampliar/reducir filtros

##### 9. 🔧 **Mantenimiento y Costos**
- **Lógica**: Alertas sobre costos asociados
- **Criterios**:
  - Vehículos con muchos cilindros = más consumo
  - Modelos luxury = mantenimiento caro
  - Kilometraje alto = más mantenimiento próximo
- **Mostrar**:
  - Estimación de costos de operación
  - Comparativa con modelos similares
  - Badge de eficiencia (A-F)

##### 10. 🎯 **Mejores Deals Hoy**
- **Lógica**: Alertas de precio destacadas
- **Criterios**:
  - Precio significativamente bajo comparado con similares
  - Condición buena
  - Posting reciente
- **Mostrar**:
  - 1-3 deals del día
  - % de descuento estimado
  - Badge "Deal del Día" o "Precio Destacado"
  - Countdown (si es limitado)

---

## 🏛️ Arquitectura y Organización

### Estructura de Carpetas

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── MainLayout.tsx
│   │   └── Breadcrumbs.tsx
│   ├── filters/
│   │   ├── FilterBar.tsx
│   │   ├── CascadeFilter.tsx
│   │   └── FilterChip.tsx
│   ├── kpi/
│   │   ├── KPICard.tsx
│   │   ├── TotalVehiclesCard.tsx
│   │   ├── ConditionCard.tsx
│   │   ├── TypeCard.tsx
│   │   ├── DriveCard.tsx
│   │   └── TransmissionCard.tsx
│   ├── charts/
│   │   ├── ChartGrid.tsx
│   │   ├── ChartCard.tsx
│   │   ├── PriceDistributionChart.tsx
│   │   ├── YearVsPriceChart.tsx
│   │   ├── TopManufacturersChart.tsx
│   │   ├── FuelTypeDistributionChart.tsx
│   │   └── ... (otras gráficas)
│   ├── insights/
│   │   ├── InsightsSection.tsx
│   │   ├── InsightCard.tsx
│   │   └── InsightTypes.tsx
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   └── ErrorBoundary.tsx
│   └── ui/
│       └── (componentes de shadcn/ui o librería UI)
├── pages/
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   └── Reports.tsx
├── hooks/
│   ├── useFilters.ts
│   ├── useVehicleData.ts
│   ├── useChartData.ts
│   ├── useInsights.ts
│   └── useDebounce.ts
├── context/
│   ├── FilterContext.tsx
│   ├── DataContext.tsx
│   └── ThemeContext.tsx
├── services/
│   ├── api.ts
│   ├── dataProcessing.ts
│   ├── calculations.ts
│   └── insightsEngine.ts
├── utils/
│   ├── formatters.ts (precio, fechas, números)
│   ├── validators.ts
│   ├── constants.ts
│   └── helpers.ts
├── types/
│   ├── vehicle.types.ts
│   ├── filter.types.ts
│   ├── chart.types.ts
│   └── insight.types.ts
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── components/
└── assets/
    ├── images/
    └── icons/
```

### Tipos de Datos (TypeScript)

```typescript
// vehicle.types.ts
interface Vehicle {
  id: string;
  url: string;
  region: string;
  region_url: string;
  price: number;
  year: number;
  manufacturer: string;
  model: string;
  condition: 'excellent' | 'good' | 'fair' | 'like new' | 'salvage' | 'new';
  cylinders: number;
  fuel: 'gas' | 'diesel' | 'electric' | 'hybrid' | 'other';
  odometer: number;
  title_status: string;
  transmission: 'automatic' | 'manual' | 'other';
  VIN: string;
  drive: '4wd' | 'fwd' | 'rwd';
  size: string;
  type: 'sedan' | 'SUV' | 'truck' | 'coupe' | 'wagon' | 'convertible' | 'hatchback' | 'van' | 'pickup' | 'other';
  paint_color: string;
  image_url: string;
  description: string;
  county: string;
  state: string;
  lat: number;
  long: number;
  posting_date: string;
}

// filter.types.ts
interface FilterState {
  manufacturer: string | null;
  model: string | null;
  type: string | null;
  paint_color: string | null;
  drive: string | null;
  transmission: string | null;
  priceRange: [number, number] | null;
  yearRange: [number, number] | null;
}

interface FilterOptions {
  manufacturers: string[];
  models: string[];
  types: string[];
  colors: string[];
  drives: string[];
  transmissions: string[];
}

// insight.types.ts
interface Insight {
  id: string;
  type: 'recommendation' | 'trend' | 'alert' | 'comparison';
  title: string;
  description: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## 🔄 Flujo de Trabajo y Datos

### Flujo General de la Aplicación

```
1. Carga Inicial
   ├─→ Fetch dataset completo (o primera página)
   ├─→ Procesar datos en memoria
   ├─→ Extraer opciones de filtros disponibles
   └─→ Calcular KPIs iniciales

2. Usuario Selecciona Filtro
   ├─→ Actualizar FilterContext
   ├─→ Si es Manufacturer → Filtrar Models disponibles
   ├─→ Re-calcular opciones de filtros restantes
   └─→ Trigger re-cálculo de datos

3. Procesamiento de Datos
   ├─→ Aplicar todos los filtros activos
   ├─→ Calcular KPIs con datos filtrados
   ├─→ Generar datos para gráficas
   ├─→ Ejecutar insights engine
   └─→ Actualizar UI

4. Renderizado
   ├─→ Mostrar loading states
   ├─→ Animar cambios en KPIs
   ├─→ Re-renderizar gráficas
   └─→ Actualizar sugerencias
```

### Estado Global (Context API)

#### `FilterContext`
```typescript
{
  filters: FilterState,
  availableOptions: FilterOptions,
  updateFilter: (key, value) => void,
  clearFilter: (key) => void,
  clearAllFilters: () => void,
  isFiltered: boolean
}
```

#### `DataContext`
```typescript
{
  rawData: Vehicle[],
  filteredData: Vehicle[],
  isLoading: boolean,
  error: Error | null,
  kpis: KPIData,
  chartData: ChartData,
  insights: Insight[]
}
```

### Optimizaciones de Performance

1. **Memoización**:
   - Usar `useMemo` para cálculos costosos (filtrado, agregaciones)
   - Usar `useCallback` para funciones pasadas como props

2. **Virtualización**:
   - Si se muestran listas largas, usar `react-window` o `react-virtualized`

3. **Lazy Loading**:
   - Cargar gráficas solo cuando están en viewport (`react-intersection-observer`)
   - Code splitting por rutas

4. **Debouncing**:
   - Debounce en búsquedas dentro de filtros (300ms)

5. **Web Workers** (opcional avanzado):
   - Procesamiento pesado de datos en background thread

---

## 🔍 Sistema de Filtros

### Lógica de Cascada

#### Dependencias
```
Manufacturer (independiente)
    ↓
Model (dependiente de Manufacturer)

Type, Paint Color, Drive, Transmission (todos independientes)
```

#### Flujo de Actualización

**Caso 1: Usuario selecciona Manufacturer**
```
1. Set manufacturer en FilterState
2. Filtrar dataset por manufacturer
3. Extraer models únicos del dataset filtrado
4. Actualizar availableOptions.models
5. Si model actual no está en nuevos models → clear model
6. Re-calcular todos los datos
```

**Caso 2: Usuario selecciona Model (con Manufacturer activo)**
```
1. Set model en FilterState
2. Aplicar ambos filtros (manufacturer AND model)
3. Re-calcular datos
```

**Caso 3: Usuario cambia Manufacturer (con Model activo)**
```
1. Clear model (porque models van a cambiar)
2. Set nuevo manufacturer
3. Extraer nuevos models
4. Re-calcular datos
```

### Interfaz de Usuario de Filtros

#### Estados Visuales
- **Default**: Dropdown cerrado, placeholder gris
- **Filled**: Valor seleccionado, texto negro/azul
- **Open**: Dropdown abierto, lista de opciones
- **Disabled**: Gris claro, no interactivo (cuando depende de otro filtro)
- **Loading**: Spinner pequeño mientras se actualizan opciones

#### Indicadores
- **Badge con contador**: Número de opciones disponibles
- **Clear button**: X pequeña al lado del valor seleccionado
- **Active indicator**: Borde azul o background sutil cuando tiene valor

---

## 📊 KPIs y Gráficas

### Cálculos de KPIs

#### Total de Vehículos
```
Count de filteredData.length
Comparación: (filteredData.length / rawData.length) * 100
```

#### Condición
```
Agrupar por condition
Calcular porcentajes de cada condición
Mostrar la más común o distribución
```

#### Type
```
Agrupar por type
Top 3 tipos más comunes
Porcentaje de cada uno
```

#### Drive
```
Count por cada tipo (4wd, fwd, rwd)
Calcular porcentajes
```

#### Transmission
```
Count automatic vs manual
Ratio en porcentaje
```

### Procesamiento de Datos para Gráficas

#### Agregaciones Necesarias
- **Por precio**: Bins/rangos, promedio, mediana, quartiles
- **Por año**: Agrupar por año, calcular promedio de precio/odometer
- **Por manufacturer**: Count, precio promedio
- **Por región**: Precio promedio por estado
- **Por fecha**: Agrupar por mes, count de postings

#### Formato de Datos para Recharts
```typescript
// Ejemplo: Price Distribution
[
  { range: '$0-$10k', count: 120, percentage: 15 },
  { range: '$10k-$20k', count: 300, percentage: 37.5 },
  ...
]

// Ejemplo: Year vs Price
[
  { year: 2020, avgPrice: 25000, count: 150 },
  { year: 2021, avgPrice: 28000, count: 200 },
  ...
]
```

---

## 💡 Top Sugerencias

### Insights Engine

#### Arquitectura del Motor de Insights

```typescript
// insightsEngine.ts
class InsightsEngine {
  constructor(data: Vehicle[], filters: FilterState) {}
  
  generateAllInsights(): Insight[] {
    return [
      this.getBestDeals(),
      this.getValueRetention(),
      this.getTrends(),
      this.getRegionalOpportunities(),
      this.getEcoFriendlyInsights(),
      this.getReliableManufacturers(),
      this.getRecentPostings(),
      this.getUserProfile(),
      this.getMaintenanceCosts(),
      this.getTodayDeals()
    ].filter(insight => insight !== null);
  }
  
  private getBestDeals(): Insight | null { ... }
  private getValueRetention(): Insight | null { ... }
  // ... otros métodos
}
```

#### Priorización de Insights
1. **High priority**: Deals del día, alertas de precio
2. **Medium priority**: Tendencias, oportunidades regionales
3. **Low priority**: Información general, estadísticas

#### Límite de Sugerencias
- Mostrar máximo **6-8 insights** simultáneamente
- Priorizar por relevancia y filtros activos del usuario
- Actualizar cuando cambien los filtros

---

## 🎯 Separación de Responsabilidades

### Principios SOLID Aplicados

#### 1. Single Responsibility Principle (SRP)
- **Cada componente tiene UNA responsabilidad clara**
  - `FilterBar`: Solo maneja la UI de filtros
  - `KPICard`: Solo muestra una métrica
  - `useFilters`: Solo maneja lógica de filtros
  - `dataProcessing.ts`: Solo procesa y transforma datos

#### 2. Composición sobre Herencia
- Usar composición de componentes pequeños y reutilizables
- Ejemplo: `ChartCard` wrappea cualquier tipo de gráfica

#### 3. Separación de Concerns

**Capa de Presentación** (Components)
- Solo JSX y lógica de UI
- No contiene lógica de negocio
- Recibe datos via props
- Emite eventos via callbacks

**Capa de Lógica** (Hooks/Context)
- Maneja estado
- Procesa interacciones del usuario
- Orquesta llamadas a servicios
- No contiene JSX

**Capa de Datos** (Services)
- Fetch de datos (API calls)
- Transformaciones de datos
- Cálculos complejos
- Caché y persistencia

**Capa de Utilidades** (Utils)
- Funciones puras
- Formatters, validators
- Helpers sin side effects

### Ejemplo de Separación

```
Usuario hace click en filtro
        ↓
FilterBar component (UI)
        ↓
onFilterChange callback
        ↓
useFilters hook (Lógica)
        ↓
updateFilter → FilterContext
        ↓
dataProcessing service (Procesamiento)
        ↓
DataContext actualizado
        ↓
Components se re-renderizan con nuevos datos
```

---

## ✅ Buenas Prácticas

### 1. Código Limpio

#### Nomenclatura
- **Componentes**: PascalCase (`FilterBar`, `KPICard`)
- **Funciones/Variables**: camelCase (`handleFilterChange`, `filteredData`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_PRICE`, `DEFAULT_FILTERS`)
- **Archivos**: kebab-case para utils (`data-processing.ts`)

#### Estructura de Componentes
```typescript
// Orden recomendado:
1. Imports
2. Types/Interfaces
3. Constants
4. Component definition
   a. Props destructuring
   b. Hooks (useState, useEffect, custom hooks)
   c. Derived state (useMemo, useCallback)
   d. Event handlers
   e. Helper functions (dentro del componente)
   f. Render logic
5. Exports
6. Styled components (si aplica)
```

### 2. TypeScript

#### Tipado Estricto
- **No usar `any`**: Preferir `unknown` o tipos específicos
- **Interfaces sobre types** para objetos
- **Types para unions** y funciones
- **Tipado de props**: Siempre explícito
- **Tipado de hooks**: ReturnType explícito

#### Ejemplos
```typescript
// ✅ Bueno
interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

// ❌ Malo
interface KPICardProps {
  title: any;
  value: any;
  icon: any;
  trend?: any;
}
```

### 3. Performance

#### Optimizaciones Críticas
- **React.memo**: Para componentes que reciben props complejas
- **useMemo**: Para cálculos costosos
  - Filtrado de arrays grandes
  - Agregaciones (sum, avg, group by)
  - Transformaciones de datos para gráficas
- **useCallback**: Para funciones pasadas como props
- **Lazy loading**: Code splitting de rutas y componentes pesados
- **Virtual scrolling**: Si hay listas con +100 items

#### Ejemplo
```typescript
// ✅ Bueno
const filteredVehicles = useMemo(() => {
  return rawData.filter(vehicle => {
    // lógica de filtrado pesada
  });
}, [rawData, filters]);

// ❌ Malo (se ejecuta en cada render)
const filteredVehicles = rawData.filter(vehicle => {
  // lógica de filtrado pesada
});
```

### 4. Gestión de Estado

#### Cuándo usar cada solución
- **useState**: Estado local del componente (isOpen, inputValue)
- **useReducer**: Estado complejo con múltiples sub-valores
- **Context API**: Estado compartido entre múltiples componentes
- **Zustand**: Si Context API se vuelve muy complejo

#### Evitar prop drilling
```
// ❌ Malo
App → Dashboard → FilterBar → CascadeFilter → Option
    (passing filters through 5 levels)

// ✅ Bueno
FilterContext Provider → CascadeFilter usa useFilters()
```

### 5. Manejo de Errores

#### Error Boundaries
- Wrappear secciones críticas (gráficas, filtros)
- Mostrar fallback UI amigable
- Logging de errores

#### Try-Catch
- En funciones async (API calls)
- En procesamiento de datos
- Mostrar toasts/alerts al usuario

#### Loading States
- Skeleton loaders para mejor UX
- Disabled states en filtros mientras cargan opciones
- Progress indicators para operaciones largas

### 6. Accesibilidad (a11y)

#### Semántica HTML
- Usar tags correctos (`<nav>`, `<main>`, `<section>`)
- Headers jerárquicos (h1, h2, h3)
- `<button>` para acciones, `<a>` para links

#### ARIA
- `aria-label` en iconos sin texto
- `aria-expanded` en dropdowns
- `aria-selected` en filtros activos
- `role="alert"` para notificaciones

#### Keyboard Navigation
- Tab order lógico
- Enter/Space para activar buttons
- Escape para cerrar modals/dropdowns
- Arrow keys en dropdowns

#### Contraste
- Ratio mínimo 4.5:1 para texto
- Verificar con herramientas (axe DevTools)

### 7. Testing (Recomendaciones)

#### Unit Tests
- Funciones puras en utils/
- Lógica de custom hooks
- Cálculos en services/

#### Integration Tests
- Flujo de filtros
- Actualización de KPIs al filtrar
- Cascada de filtros (Manufacturer → Model)

#### E2E Tests (opcional)
- Happy path: Usuario filtra y ve resultados
- Edge cases: Sin resultados, filtros vacíos

### 8. Documentación

#### Comentarios
- JSDoc para funciones complejas
- Comentarios inline para lógica no obvia
- README con instrucciones de setup

#### Storybook (opcional)
- Documentar componentes visuales
- Mostrar variantes y estados
- Facilita desarrollo aislado

### 9. Git y Versionado

#### Commits
- Mensajes descriptivos en español o inglés consistente
- Formato: `tipo: descripción`
  - `feat:` nueva funcionalidad
  - `fix:` corrección de bug
  - `style:` cambios de estilo/formato
  - `refactor:` refactorización sin cambios funcionales
  - `docs:` documentación

#### Branching
- `main`: producción
- `develop`: desarrollo activo
- `feature/nombre`: nuevas features
- `fix/nombre`: bug fixes

### 10. Responsive Design

#### Breakpoints
```css
/* Mobile first approach */
- xs: 0-639px (mobile)
- sm: 640px-767px (large mobile)
- md: 768px-1023px (tablet)
- lg: 1024px-1279px (laptop)
- xl: 1280px+ (desktop)
```

#### Grid Systems
- Cards KPI: 1 col mobile, 2-3 cols tablet, 5 cols desktop
- Gráficas: 1 col mobile, 2 cols desktop
- Filtros: Stack vertical en mobile, horizontal en desktop

#### Touch Targets
- Mínimo 44x44px en mobile
- Espaciado generoso entre elementos interactivos

---

## 🚀 Roadmap de Implementación

### Fase 1: Setup y Estructura (Día 1-2)
1. Configurar proyecto Vite + React + TypeScript
2. Instalar dependencias (Tailwind, Recharts, etc.)
3. Crear estructura de carpetas
4. Definir tipos base en `/types`
5. Implementar `MainLayout` y `Navbar`

### Fase 2: Sistema de Filtros (Día 3-4)
1. Crear `FilterContext` y `useFilters` hook
2. Implementar `FilterBar` y `CascadeFilter`
3. Lógica de cascada (Manufacturer → Model)
4. Integrar con datos mock inicialmente

### Fase 3: KPIs (Día 5-6)
1. Implementar `KPICard` base
2. Crear las 5 cards específicas
3. Conectar con `DataContext`
4. Animaciones de counter

### Fase 4: Integración de Datos Real (Día 7-8)
1. Conectar con API/dataset real
2. Implementar `dataProcessing.ts`
3. Cálculos de agregaciones
4. Loading states y error handling

### Fase 5: Gráficas (Día 9-12)
1. Setup de Recharts
2. Implementar 3-4 gráficas principales primero
3. Responsive design de gráficas
4. Interactividad y tooltips

### Fase 6: Insights Engine (Día 13-15)
1. Crear `InsightsEngine` class
2. Implementar lógica de 5-6 insights principales
3. UI de `InsightCard`
4. Priorización y filtrado de insights

### Fase 7: Polish y Optimización (Día 16-18)
1. Optimizaciones de performance (memoization)
2. Responsive design final
3. Accesibilidad
4. Testing básico

### Fase 8: Deploy (Día 19-20)
1. Build de producción
2. Optimizaciones finales
3. Deploy en Vercel/Netlify
4. Documentación final

---

## 📝 Notas Finales

### Consideraciones de Big Data

#### Paginación/Lazy Loading
- Si dataset > 100,000 registros:
  - Implementar paginación en backend
  - Cargar datos en chunks
  - Virtual scrolling en listas

#### Caché
- Cachear resultados de filtros comunes
- LocalStorage para filtros del usuario
- Service Worker para datos offline

#### Performance Monitoring
- Medir tiempo de filtrado
- Medir tiempo de render de gráficas
- Usar React DevTools Profiler

### Extensibilidad Futura

#### Features Adicionales
- Export de datos (CSV, PDF)
- Comparador de vehículos (side by side)
- Alertas personalizadas (email cuando hay deal)
- Mapa interactivo con geolocalizaciónón
- Modo oscuro
- Favoritos/Watchlist
- Compartir filtros via URL

#### Mejoras de Analytics
- Tracking de eventos (Google Analytics)
- Heatmaps de interacción
- A/B testing de layouts

---

**Documento creado para**: AutoInsights Frontend Development  
**Última actualización**: 21 de enero de 2026  
**Versión**: 1.0
