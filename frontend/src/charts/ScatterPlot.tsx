import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { MileagePoint } from '../lib/types';
import { AXIS, GRID, TOOLTIP } from './theme';

interface ScatterPlotProps {
  points: MileagePoint[];
  xName: string;
  yName: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  height?: number;
}

export default function ScatterPlot({ points, xName, yName, formatX, formatY, height = 300 }: ScatterPlotProps) {
  return (
    <div style={{ width: '100%', height }} aria-hidden="true">
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
            formatter={(value, name) => [
              name === xName ? formatX(Number(value)) : formatY(Number(value)),
              name,
            ]}
          />
          <Scatter data={points} fill="var(--data-light)" fillOpacity={0.55} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
