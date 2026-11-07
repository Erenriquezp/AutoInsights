import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, axisWidth, GRID, TOOLTIP } from './theme';

export interface Series {
  name: string;
  /** year -> value */
  values: Map<number, number>;
}

interface CompareLineChartProps {
  primary: Series;
  secondary: Series;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  height?: number;
}

/**
 * Two series over model years. The vehicle being analyzed is the evidence (accent, solid line,
 * round markers); the comparison is light graphite, dashed, with square markers, so the two stay
 * distinguishable without relying on color.
 */
export default function CompareLineChart({ primary, secondary, formatValue, formatAxis, height = 300 }: CompareLineChartProps) {
  const years = [...new Set([...primary.values.keys(), ...secondary.values.keys()])].sort((a, b) => a - b);
  const data = years.map((year) => ({
    year: String(year),
    a: primary.values.get(year) ?? null,
    b: secondary.values.get(year) ?? null,
  }));

  return (
    <div style={{ width: '100%', height: `${height / 16}rem` }} aria-hidden="true">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="year" {...AXIS} tickMargin={8} interval="preserveStartEnd" />
          <YAxis {...AXIS} width={axisWidth([formatAxis(Math.max(0, ...primary.values.values(), ...secondary.values.values()) * 1.1)])} tickFormatter={formatAxis} />
          <Tooltip {...TOOLTIP} formatter={(value) => formatValue(Number(value))} />
          <Legend wrapperStyle={{ color: '#9aa0a8', fontSize: 13, paddingTop: 8 }} iconType="plainline" />
          <Line
            name={primary.name}
            dataKey="a"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--accent)' }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            name={secondary.name}
            dataKey="b"
            stroke="var(--data-light)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: 'var(--data-light)', strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
