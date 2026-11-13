import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '../components/ui';
import { niceScale } from '../lib/stats';
import { ChartFrame } from './ChartFrame';
import { axisWidth, CHART } from './theme';

export interface HistogramBin {
  /** where the bin starts, in the unit of the x-axis */
  start: number;
  count: number;
  /** heading of the tooltip: the bin's range in words ("$4,000 to $6,000") */
  title: string;
}

interface HistogramProps {
  bins: HistogramBin[];
  label: string;
  countName: string;
  formatCount: (value: number) => string;
  /** x-axis labels, shown only for bins that start on a multiple of `tickEvery` */
  formatTick: (start: number) => string;
  tickEvery: number;
  /** a reference value on the x-axis (the median) and the words printed next to it */
  marker?: { value: number; text: string };
  height?: number;
}

/** How many things fall in each band of a measure: touching bars, round ticks, one reference line. */
export default function Histogram({ bins, label, countName, formatCount, formatTick, tickEvery, marker, height = 240 }: HistogramProps) {
  const scale = niceScale(Math.max(0, ...bins.map((b) => b.count)));
  const ticks = bins.filter((b) => b.start % tickEvery === 0).map((b) => b.start);
  // the bar the marker falls in; the line is drawn through its middle
  const markerBin = marker ? [...bins].reverse().find((b) => b.start <= marker.value) : undefined;
  const markerIndex = markerBin ? bins.indexOf(markerBin) : -1;

  return (
    <ChartFrame label={label} height={height}>
      <ResponsiveContainer>
        <BarChart data={bins} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap={1}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis {...CHART.axis} dataKey="start" ticks={ticks} tickFormatter={formatTick} interval="equidistantPreserveStart" minTickGap={18} tickMargin={8} />
          <YAxis {...CHART.axis} width={axisWidth(scale.ticks.map(formatCount))} domain={[0, scale.max]} ticks={scale.ticks} tickFormatter={formatCount} />
          <Tooltip
            cursor={CHART.cursorBand}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const bin = active ? (payload?.[0]?.payload as HistogramBin | undefined) : undefined;
              return bin ? <ChartTooltip title={bin.title} rows={[{ name: countName, value: formatCount(bin.count) }]} /> : null;
            }}
          />
          <Bar dataKey="count" fill={CHART.fill} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          {marker && markerBin && (
            <ReferenceLine
              x={markerBin.start}
              stroke={CHART.ink}
              strokeWidth={1.5}
              // the words sit on the side with more room
              label={{ value: marker.text, position: markerIndex > bins.length / 2 ? 'insideTopRight' : 'insideTopLeft', dy: -22, ...CHART.label }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
