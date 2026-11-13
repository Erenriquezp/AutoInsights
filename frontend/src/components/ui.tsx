import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { useI18n } from '../i18n/context';
import { Icon, type IconName } from './Icon';
import './ui.css';
import './cockpit.css';

/* ---------------------------------------------------------------- panel */

export interface TableData {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
  /** columns aligned right (numbers) */
  numeric?: number[];
}

interface PanelProps {
  title: string;
  help?: ReactNode;
  children: ReactNode;
  /** the chart's data as a table, behind a "Show the data" toggle */
  table?: TableData;
  footnote?: ReactNode;
  className?: string;
}

export function Panel({ title, help, children, table, footnote, className = '' }: PanelProps) {
  const { t } = useI18n();
  const [showData, setShowData] = useState(false);
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {help && <p className="panel-help">{help}</p>}
        </div>
        {table && (
          <button type="button" className="text-button" aria-expanded={showData} onClick={() => setShowData((s) => !s)}>
            {showData ? t.data.hide : t.data.show}
          </button>
        )}
      </header>
      {showData && table ? <DataTable {...table} /> : children}
      {footnote && <p className="panel-footnote">{footnote}</p>}
    </section>
  );
}

export function DataTable({ caption, columns, rows, numeric = [], region = false }: TableData & { region?: boolean }) {
  // region: a fixed-height box that scrolls by itself, so it has to be reachable with the keyboard
  const wrapper = region ? { className: 'table-region', tabIndex: 0, role: 'region', 'aria-label': caption } : { className: 'table-scroll' };
  return (
    <div {...wrapper}>
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={numeric.includes(i) ? 'num' : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} className={numeric.includes(i) ? 'num' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- KPI band (dimension readouts) */

export interface Readout {
  label: string;
  value: string;
  note?: string;
  /** an "evidence" figure: drawn in the accent */
  evidence?: boolean;
  /** a word rather than a number (a state name): smaller and allowed to wrap */
  text?: boolean;
}

export function KpiBand({ label, items }: { label: string; items: Readout[] }) {
  return (
    <section className="kpi-band" aria-label={label}>
      <dl>
        {items.map((item) => (
          <div key={item.label} className={`readout${item.evidence ? ' is-evidence' : ''}${item.text ? ' is-text' : ''}`}>
            <dt>{item.label}</dt>
            <dd>
              <span className="readout-value mono">{item.value}</span>
              {item.note && <span className="readout-note">{item.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------------- ranked bars */

export interface BarItem {
  label: string;
  value: number;
  display: string;
  highlight?: boolean;
  muted?: boolean;
}

export function BarList({ items, label }: { items: BarItem[]; label: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="bar-list" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className={item.highlight ? 'is-highlight' : item.muted ? 'is-muted' : undefined}>
          <span className="bar-label">{item.label}</span>
          <span className="bar-track" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${Math.max(1, (item.value / max) * 100)}%` }} />
          </span>
          <span className="bar-value mono">{item.display}</span>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================ "Night cockpit" components
   The new design system. Pages move to these one by one; Panel and KpiBand above go away when
   the last page has moved. */

/* ---------------------------------------------------------------- button */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the one action of a view. secondary: everything else. quiet: inside dense rows. */
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'md' | 'sm';
  icon?: IconName;
}

export function Button({ variant = 'secondary', size = 'md', icon, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`button button-${variant} button-${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- segmented control */

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Segment<T>[]; onChange: (value: T) => void }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- card */

interface CardProps {
  title: string;
  help?: ReactNode;
  children: ReactNode;
  /** the chart's data as a table: adds the Chart / Table switch, always top right */
  table?: TableData;
  footnote?: ReactNode;
  className?: string;
}

export function Card({ title, help, children, table, footnote, className = '' }: CardProps) {
  const { t } = useI18n();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const titleId = useId();
  return (
    <section className={`card ${className}`} aria-labelledby={titleId}>
      <header className="card-head">
        <h2 id={titleId}>{title}</h2>
        {table && (
          <Segmented
            label={t.data.view}
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: t.data.chart, icon: 'chart' },
              { value: 'table', label: t.data.table, icon: 'table' },
            ]}
          />
        )}
        {help && <p className="card-help">{help}</p>}
      </header>
      <div className="card-body">{view === 'table' && table ? <DataTable {...table} region /> : children}</div>
      {footnote && <p className="card-footnote">{footnote}</p>}
    </section>
  );
}

/* ---------------------------------------------------------------- key figures */

export interface Figure {
  label: string;
  value: string;
  note?: string;
  /** a share between 0 and 1, drawn as a meter under the note (the note says the same in words) */
  meter?: number;
}

/** The first figure leads: it is larger and sits on its own raised tile. */
export function KpiStrip({ label, items }: { label: string; items: Figure[] }) {
  return (
    <section className="kpi-strip" aria-label={label}>
      <dl>
        {items.map((item, i) => (
          <div key={item.label} className={i === 0 ? 'kpi kpi-lead' : 'kpi'}>
            <dt>{item.label}</dt>
            <dd>
              <span className="kpi-value">{item.value}</span>
              {item.note && <span className="kpi-note">{item.note}</span>}
              {item.meter !== undefined && (
                <span className="kpi-meter" aria-hidden="true">
                  <span style={{ width: `${Math.round(Math.min(1, Math.max(0, item.meter)) * 100)}%` }} />
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------------------------------------------- chart tooltip */

export interface TooltipRow {
  name: string;
  value: string;
  /** the series' color, drawn as a short stroke before the name (two or more series) */
  swatch?: string;
  dashed?: boolean;
}

/** The floating readout of a chart: what the mark is, then its numbers. */
export function ChartTooltip({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{title}</p>
      <dl>
        {rows.map((row) => (
          <div key={row.name}>
            <dt>
              {row.swatch && <span className={row.dashed ? 'chart-key is-dashed' : 'chart-key'} style={{ color: row.swatch }} aria-hidden="true" />}
              {row.name}
            </dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------------------------------------------------------------- loading, error, empty */

export function Loading({ height = 200 }: { height?: number }) {
  const { t } = useI18n();
  return (
    <div className="state state-loading" style={{ minHeight: `${height / 16}rem` }} role="status">
      <span className="visually-hidden">{t.states.loading}</span>
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  height?: number;
  /** use the new design system's button (until every page has moved) */
  refined?: boolean;
}

export function ErrorState({ error, onRetry, height = 200, refined = false }: ErrorStateProps) {
  const { t } = useI18n();
  const network = error instanceof ApiError && error.code === 'network';
  return (
    <div className="state state-error" style={{ minHeight: `${height / 16}rem` }} role="alert">
      <p>{network ? t.states.errorNetwork : t.states.error}</p>
      {onRetry &&
        (refined ? (
          <Button onClick={onRetry}>{t.states.retry}</Button>
        ) : (
          <button type="button" className="btn" onClick={onRetry}>
            {t.states.retry}
          </button>
        ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="state state-empty">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}
