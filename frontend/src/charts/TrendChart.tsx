import { useId } from 'react';
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip, type TooltipRow } from '../components/ui';
import { niceScale } from '../lib/stats';
import { ChartFrame } from './ChartFrame';
import { axisWidth, CHART } from './theme';

export interface TrendPoint {
  key: string | number;
  /** x-axis label */
  label: string;
  value: number;
  /** heading of the tooltip ("Model year 2012") */
  title?: string;
  /** more tooltip lines, under the value */
  detail?: TooltipRow[];
  /** how much data is behind the value: drawn as a strip of bars under the line */
  volume?: number;
  /** a label printed next to this point */
  mark?: string;
}

interface TrendChartProps {
  data: TrendPoint[];
  label: string;
  valueName: string;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  height?: number;
}

/**
 * An ordered series as a line over a soft area. When the points carry a volume, a strip of
 * bars underneath shows it on its own scale (two small charts, never two y-axes on one).
 */
export default function TrendChart({ data, label, valueName, formatValue, formatAxis, height = 260 }: TrendChartProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scale = niceScale(Math.max(0, ...data.map((d) => d.value)));
  const yWidth = axisWidth(scale.ticks.map(formatAxis));
  const hasVolume = data.some((d) => d.volume !== undefined);
  const xAxis = { ...CHART.axis, dataKey: 'label', interval: 'equidistantPreserveStart', minTickGap: 28, tickMargin: 8 } as const;

  return (
    <ChartFrame label={label} height={height}>
      <div className="chart-main">
        <ResponsiveContainer>
          <ComposedChart accessibilityLayer={false} data={data} syncId={id} margin={{ top: 22, right: 12, bottom: hasVolume ? 8 : 0, left: 0 }}>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.line} stopOpacity={0.34} />
                <stop offset="100%" stopColor={CHART.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis {...xAxis} hide={hasVolume} />
            <YAxis {...CHART.axis} width={yWidth} domain={[0, scale.max]} ticks={scale.ticks} tickFormatter={formatAxis} />
            <Tooltip
              cursor={CHART.cursorLine}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const point = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined;
                if (!point) return null;
                return <ChartTooltip title={point.title ?? point.label} rows={[{ name: valueName, value: formatValue(point.value) }, ...(point.detail ?? [])]} />;
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke={CHART.line}
              strokeWidth={2}
              fill={`url(#${id}-fill)`}
              dot={false}
              activeDot={{ r: 5, fill: CHART.line, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {data.map((d, i) =>
              d.mark ? (
                <ReferenceDot
                  key={d.key}
                  x={d.label}
                  y={d.value}
                  r={4.5}
                  fill={CHART.line}
                  stroke={CHART.surface}
                  strokeWidth={2}
                  // the last point's label goes to its left, or it would be cut at the edge
                  label={{ value: d.mark, position: i === data.length - 1 ? 'left' : 'top', offset: 10, ...CHART.label }}
                />
              ) : null,
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hasVolume && (
        <div className="chart-strip">
          <ResponsiveContainer>
            <BarChart accessibilityLayer={false} data={data} syncId={id} margin={{ top: 6, right: 12, bottom: 0, left: yWidth }} barCategoryGap="22%">
              <XAxis {...xAxis} />
              <YAxis hide domain={[0, 'dataMax']} />
              <Tooltip cursor={CHART.cursorBand} content={() => null} isAnimationActive={false} />
              <Bar dataKey="volume" fill={CHART.fill} fillOpacity={0.75} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}
