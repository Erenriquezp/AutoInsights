import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '../components/ui';
import { niceScale } from '../lib/stats';
import { ChartFrame } from './ChartFrame';
import { axisWidth, CHART } from './theme';

export interface LineSeries {
  name: string;
  points: { x: number; y: number }[];
  /** a label printed at one point of the line */
  mark?: { x: number; text: string };
}

interface LinesChartProps {
  /** one or two series over the same numeric x (model years, years of age) */
  series: LineSeries[];
  label: string;
  /** heading of the tooltip for an x ("Model year 2016", "5 years older") */
  titleFor: (x: number) => string;
  formatX: (x: number) => string;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  /** a horizontal reference (100 % on an index) */
  baseline?: number;
  height?: number;
}

/**
 * One or two lines. The first is solid, the second dashed, so they stay apart without color;
 * with two there is a legend, and the tooltip lists both at the x under the pointer.
 */
export default function LinesChart({ series, label, titleFor, formatX, formatValue, formatAxis, baseline, height = 280 }: LinesChartProps) {
  const single = series.length === 1;
  const colors = single ? [CHART.line] : CHART.series;
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const rows = xs.map((x) => ({ x, ...Object.fromEntries(series.map((s, i) => [`s${i}`, s.points.find((p) => p.x === x)?.y ?? null])) }));
  const scale = niceScale(Math.max(0, baseline ?? 0, ...series.flatMap((s) => s.points.map((p) => p.y))));
  // whole-number ticks on a round step (every 1, 2, 5 or 10), at most eight of them
  const [minX, maxX] = [xs[0] ?? 0, xs[xs.length - 1] ?? 0];
  const step = [1, 2, 5, 10, 20, 50].find((s) => (maxX - minX) / s <= 8) ?? 100;
  const xTicks = Array.from({ length: Math.floor(maxX / step) - Math.ceil(minX / step) + 1 }, (_, i) => (Math.ceil(minX / step) + i) * step);

  return (
    <ChartFrame
      label={label}
      height={height}
      legend={series.map((s, i) => ({ name: s.name, color: colors[i], dashed: i === 1 }))}
    >
      <ResponsiveContainer>
        <LineChart accessibilityLayer={false} data={rows} margin={{ top: 22, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            {...CHART.axis}
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={xTicks}
            tickFormatter={formatX}
            interval="equidistantPreserveStart"
            minTickGap={16}
            tickMargin={8}
          />
          <YAxis {...CHART.axis} width={axisWidth(scale.ticks.map(formatAxis))} domain={[0, scale.max]} ticks={scale.ticks} tickFormatter={formatAxis} />
          {baseline !== undefined && <ReferenceLine y={baseline} stroke="var(--edge-control)" strokeDasharray="2 4" />}
          <Tooltip
            cursor={CHART.cursorLine}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as Record<string, number | null> | undefined) : undefined;
              if (!row) return null;
              return (
                <ChartTooltip
                  title={titleFor(row.x as number)}
                  rows={series.flatMap((s, i) => {
                    const value = row[`s${i}`];
                    return value === null || value === undefined
                      ? []
                      : [{ name: single ? s.name : s.name, value: formatValue(value), swatch: single ? undefined : colors[i], dashed: i === 1 }];
                  })}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Line
              key={s.name}
              name={s.name}
              dataKey={`s${i}`}
              type="monotone"
              stroke={colors[i]}
              strokeWidth={2.25}
              strokeDasharray={i === 1 ? '6 4' : undefined}
              dot={false}
              activeDot={{ r: 5, fill: colors[i], stroke: CHART.surface, strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {series.map((s, i) => {
            const point = s.mark ? s.points.find((p) => p.x === s.mark?.x) : undefined;
            if (!s.mark || !point) return null;
            return (
              <ReferenceDot
                key={`mark-${s.name}`}
                x={point.x}
                y={point.y}
                r={4.5}
                fill={colors[i]}
                stroke={CHART.surface}
                strokeWidth={2}
                // to the right of the point: on a falling curve that side is clear of the line
                label={{ value: s.mark.text, position: 'right', offset: 10, ...CHART.label }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
