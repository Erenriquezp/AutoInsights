import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { MileagePoint } from '../lib/types';
import { AXIS, GRID, TOOLTIP } from './theme';

export interface ScatterSeries {
  name: string;
  points: MileagePoint[];
  /** the vehicle being analyzed: accent circles; otherwise light graphite squares */
  primary?: boolean;
}

interface ScatterPlotProps {
  series: ScatterSeries[];
  xName: string;
  yName: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  height?: number;
}

export default function ScatterPlot({ series, xName, yName, formatX, formatY, height = 300 }: ScatterPlotProps) {
  const single = series.length === 1;
  return (
    <div style={{ width: '100%', height: `${height / 16}rem` }} aria-hidden="true">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis
            type="number"
            dataKey="odometer"
            name={xName}
            {...AXIS}
            tickFormatter={formatX}
            domain={[0, 'dataMax']}
            tickMargin={8}
          />
          <YAxis type="number" dataKey="price" name={yName} {...AXIS} width={56} tickFormatter={formatY} />
          <ZAxis range={[28, 28]} />
          <Tooltip
            cursor={{ stroke: '#3a414c' }}
            {...TOOLTIP}
            formatter={(value, name) => [name === xName ? formatX(Number(value)) : formatY(Number(value)), name]}
          />
          {!single && <Legend wrapperStyle={{ color: '#9aa0a8', fontSize: 13, paddingTop: 8 }} />}
          {series.map((s) => (
            <Scatter
              key={s.name}
              name={s.name}
              data={s.points}
              // one vehicle: neutral dots; two: the analyzed one is the evidence
              fill={single ? 'var(--data-light)' : s.primary ? 'var(--accent)' : 'var(--data-light)'}
              fillOpacity={single ? 0.55 : s.primary ? 0.75 : 0.5}
              shape={s.primary || single ? 'circle' : 'square'}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
