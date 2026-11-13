import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { ChartTooltip } from '../components/ui';
import { binnedMedians, niceScale, type Bin } from '../lib/stats';
import { ChartFrame } from './ChartFrame';
import { axisWidth, CHART } from './theme';

export interface ScatterSeries {
  name: string;
  points: { x: number; y: number }[];
}

interface ScatterPlotProps {
  /** one or two clouds of points */
  series: ScatterSeries[];
  label: string;
  /** width of the x bands whose median is drawn as a line */
  binSize: number;
  medianName: string;
  countName: string;
  /** the range of a band in words ("60,000 to 80,000 miles") */
  rangeTitle: (from: number, to: number) => string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  formatAxisY: (value: number) => string;
  formatCount: (value: number) => string;
  height?: number;
}

interface MedianDot extends Bin {
  y: number;
  series: number;
}

/** A median marker with a hit area much larger than the dot, so the pointer only has to be near. */
function MedianShape({ cx, cy, fill }: { cx?: number; cy?: number; fill?: string }) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke={CHART.surface} strokeWidth={2} />
    </g>
  );
}

const NoShape = () => <g />;

/**
 * Every listing as a faint dot, and over them the median per band of x as a line: with
 * hundreds of overlapping dots, the trend is only readable if it is drawn.
 */
export default function ScatterPlot({
  series,
  label,
  binSize,
  medianName,
  countName,
  rangeTitle,
  formatX,
  formatY,
  formatAxisY,
  formatCount,
  height = 280,
}: ScatterPlotProps) {
  const single = series.length === 1;
  const cloud = single ? [CHART.fill] : CHART.series;
  const line = single ? [CHART.line] : CHART.series;
  const all = series.flatMap((s) => s.points);
  const xScale = niceScale(Math.max(0, ...all.map((p) => p.x)), 5);
  const yScale = niceScale(Math.max(0, ...all.map((p) => p.y)));
  const medians = series.map((s, i) => binnedMedians(s.points, binSize).map((bin): MedianDot => ({ ...bin, y: bin.median, series: i })));

  return (
    <ChartFrame label={label} height={height} legend={series.map((s, i) => ({ name: s.name, color: line[i], dashed: i === 1 }))}>
      <ResponsiveContainer>
        <ScatterChart accessibilityLayer={false} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART.grid} />
          <XAxis
            {...CHART.axis}
            type="number"
            dataKey="x"
            domain={[0, xScale.max]}
            ticks={xScale.ticks}
            tickFormatter={formatX}
            interval="equidistantPreserveStart"
            minTickGap={16}
            tickMargin={8}
          />
          <YAxis
            {...CHART.axis}
            type="number"
            dataKey="y"
            width={axisWidth(yScale.ticks.map(formatAxisY))}
            domain={[0, yScale.max]}
            ticks={yScale.ticks}
            tickFormatter={formatAxisY}
          />
          <ZAxis range={[14, 14]} />
          <Tooltip
            cursor={false}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const dot = active ? (payload?.[0]?.payload as MedianDot | undefined) : undefined;
              if (!dot || dot.median === undefined) return null;
              return (
                <ChartTooltip
                  title={single ? rangeTitle(dot.from, dot.to) : `${series[dot.series].name}, ${rangeTitle(dot.from, dot.to)}`}
                  rows={[
                    { name: medianName, value: formatY(dot.median) },
                    { name: countName, value: formatCount(dot.count) },
                  ]}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Scatter key={s.name} data={s.points} fill={cloud[i]} fillOpacity={single ? 0.4 : 0.3} tooltipType="none" isAnimationActive={false} />
          ))}
          {/* under each median line, a wider line in the surface color keeps it apart from the dots */}
          {medians.map((dots, i) => (
            <Scatter
              key={`ring-${series[i].name}`}
              data={dots}
              line={{ stroke: CHART.surface, strokeWidth: 6 }}
              lineJointType="monotoneX"
              shape={NoShape}
              tooltipType="none"
              isAnimationActive={false}
            />
          ))}
          {medians.map((dots, i) => (
            <Scatter
              key={`median-${series[i].name}`}
              name={series[i].name}
              data={dots}
              fill={line[i]}
              line={{ stroke: line[i], strokeWidth: 2.5, strokeDasharray: i === 1 ? '6 4' : undefined }}
              lineJointType="monotoneX"
              shape={<MedianShape />}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
