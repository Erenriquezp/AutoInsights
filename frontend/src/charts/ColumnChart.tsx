import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip, type TooltipRow } from '../components/ui';
import { AXIS, axisWidth, axisWidthSans, COCKPIT, GRID, TOOLTIP } from './theme';

export interface Column {
  key: string | number;
  label: string;
  value: number;
  highlight?: boolean;
  /** cockpit tone: the tooltip's heading for this column ("Model year 2012") */
  title?: string;
  /** cockpit tone: more lines for the tooltip, under the value */
  detail?: TooltipRow[];
}

interface ColumnChartProps {
  data: Column[];
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  valueName: string;
  height?: number;
  /** show every n-th x label */
  labelEvery?: number;
  /** cockpit: the new design system (data hue from the tokens, glass tooltip) */
  tone?: 'legacy' | 'cockpit';
}

export default function ColumnChart({
  data,
  formatValue,
  formatAxis,
  valueName,
  height = 260,
  labelEvery = 1,
  tone = 'legacy',
}: ColumnChartProps) {
  const cockpit = tone === 'cockpit';
  const axis = cockpit ? COCKPIT.axis : AXIS;
  const top = formatAxis(Math.max(0, ...data.map((d) => d.value)) * 1.1);
  return (
    <div style={{ width: '100%', height: `${height / 16}rem` }} aria-hidden="true">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke={cockpit ? COCKPIT.grid : GRID} />
          <XAxis dataKey="label" {...axis} interval={labelEvery - 1} tickMargin={8} />
          <YAxis {...axis} width={cockpit ? axisWidthSans([top]) : axisWidth([top])} tickFormatter={formatAxis} />
          {cockpit ? (
            <Tooltip
              cursor={{ fill: COCKPIT.cursor }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const column = active ? (payload?.[0]?.payload as Column | undefined) : undefined;
                if (!column) return null;
                return (
                  <ChartTooltip
                    title={column.title ?? column.label}
                    rows={[{ name: valueName, value: formatValue(column.value) }, ...(column.detail ?? [])]}
                  />
                );
              }}
            />
          ) : (
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              {...TOOLTIP}
              formatter={(value) => [formatValue(Number(value)), valueName]}
            />
          )}
          <Bar dataKey="value" radius={cockpit ? [4, 4, 0, 0] : [2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={cockpit ? (d.highlight ? COCKPIT.barStrong : COCKPIT.bar) : d.highlight ? 'var(--accent)' : 'var(--data-base)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
