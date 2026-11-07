import { useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { useI18n } from '../i18n/context';
import './ui.css';

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

export function DataTable({ caption, columns, rows, numeric = [] }: TableData) {
  return (
    <div className="table-scroll">
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
}

export function KpiBand({ label, items }: { label: string; items: Readout[] }) {
  return (
    <section className="kpi-band" aria-label={label}>
      <dl>
        {items.map((item) => (
          <div key={item.label} className={`readout${item.evidence ? ' is-evidence' : ''}`}>
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

/* ---------------------------------------------------------------- loading, error, empty */

export function Loading({ height = 200 }: { height?: number }) {
  const { t } = useI18n();
  return (
    <div className="state state-loading" style={{ minHeight: height }} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{t.states.loading}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, height = 200 }: { error: unknown; onRetry?: () => void; height?: number }) {
  const { t } = useI18n();
  const network = error instanceof ApiError && error.code === 'network';
  return (
    <div className="state state-error" style={{ minHeight: height }} role="alert">
      <p>{network ? t.states.errorNetwork : t.states.error}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t.states.retry}
        </button>
      )}
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
