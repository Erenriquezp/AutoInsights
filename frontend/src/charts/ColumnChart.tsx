import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, axisWidth, GRID, TOOLTIP } from './theme';

export interface Column {
  key: string | number;
  label: string;
  value: number;
  highlight?: boolean;
}

interface ColumnChartProps {
  data: Column[];
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  valueName: string;
  height?: number;
  /** show every n-th x label */
  labelEvery?: number;
}

export default function ColumnChart({
  data,
  formatValue,
  formatAxis,
  valueName,
  height = 260,
  labelEvery = 1,
}: ColumnChartProps) {
  return (
    <div style={{ width: '100%', height: `${height / 16}rem` }} aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            {...AXIS}
            interval={labelEvery - 1}
            tickMargin={8}
          />
          <YAxis {...AXIS} width={axisWidth([formatAxis(Math.max(0, ...data.map((d) => d.value)) * 1.1)])} tickFormatter={formatAxis} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            {...TOOLTIP}
            formatter={(value) => [formatValue(Number(value)), valueName]}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.highlight ? 'var(--accent)' : 'var(--data-base)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
