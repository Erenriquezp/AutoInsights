import type { ReactNode } from 'react';

export interface LegendItem {
  name: string;
  color: string;
  dashed?: boolean;
}

interface ChartFrameProps {
  /** what a screen reader hears instead of the drawing: usually the panel's title and help */
  label: string;
  /** minimum height in px at a 16px root; the chart grows with its panel */
  height: number;
  /** shown for two or more series; one series is named by the panel's title */
  legend?: LegendItem[];
  children: ReactNode;
}

/** The box every chart is drawn in: one accessible name, a legend when it is needed. */
export function ChartFrame({ label, height, legend, children }: ChartFrameProps) {
  return (
    <div className="chart-wrap">
      {legend && legend.length > 1 && (
        <ul className="chart-legend">
          {legend.map((item) => (
            <li key={item.name}>
              <span className={item.dashed ? 'chart-key is-dashed' : 'chart-key'} style={{ color: item.color }} aria-hidden="true" />
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <div className="chart-box" style={{ minHeight: `${height / 16}rem` }} role="img" aria-label={label}>
        <div className="chart-stack">{children}</div>
      </div>
    </div>
  );
}
