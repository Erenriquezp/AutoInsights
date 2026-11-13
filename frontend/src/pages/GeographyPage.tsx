import { useEffect, useMemo, useRef, useState } from 'react';
import StateMap, { type StateValue } from '../charts/StateMap';
import { STATE_NAMES } from '../charts/usStates';
import { Card, ErrorState, KpiStrip, Loading, Segmented } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import type { StateStats } from '../lib/types';
import { useApi } from '../lib/useApi';
import './pages.css';

type Metric = 'listings' | 'price';

const stateName = (code: string) => STATE_NAMES[code] ?? code.toUpperCase();

export default function GeographyPage() {
  const { t, f, fill } = useI18n();
  const states = useApi(api.states, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('listings');

  const total = states.status === 'ready' ? states.data.reduce((sum, s) => sum + s.count, 0) : 0;
  const sorted = useMemo(
    () => (states.status === 'ready' ? [...states.data].sort((a, b) => b.count - a.count) : []),
    [states],
  );
  const values = useMemo(
    () =>
      Object.fromEntries(
        sorted.map((s): [string, StateValue] => [
          s.state,
          {
            value: metric === 'listings' ? s.count : s.avg_price,
            lines: [fill(t.geography.listingsLine, { count: f.number(s.count) }), fill(t.geography.priceLine, { price: f.money(s.avg_price) })],
          },
        ]),
      ),
    [sorted, metric, f, t, fill],
  );

  if (states.status === 'loading') return <Loading height={420} />;
  if (states.status === 'error') {
    return (
      <Card>
        <ErrorState error={states.error} onRetry={states.retry} height={320} />
      </Card>
    );
  }

  const current = sorted.find((s) => s.state === (selected ?? sorted[0]?.state));

  return (
    <div className="grid">
      <Card
        className="wide"
        title={t.geography.mapTitle}
        help={`${t.geography.mapHelp} ${metric === 'listings' ? t.geography.mapHelpListings : t.geography.mapHelpPrice}`}
        actions={
          <Segmented
            label={t.geography.colorBy}
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'listings', label: t.geography.listings },
              { value: 'price', label: t.geography.avgPrice },
            ]}
          />
        }
      >
        <StateMap
          values={values}
          selected={current?.state ?? null}
          onSelect={setSelected}
          label={t.geography.mapTitle}
          legendTitle={metric === 'listings' ? t.geography.legendListings : t.geography.legendPrice}
          formatValue={metric === 'listings' ? f.number : f.money}
        />
        {current && (
          <div className="geo-selected" aria-live="polite">
            <KpiStrip
              nested
              lead={false}
              columns={3}
              label={t.geography.selected}
              items={[
                { label: t.geography.selected, value: stateName(current.state), text: true },
                {
                  label: t.geography.listings,
                  value: f.number(current.count),
                  note: fill(t.geography.listingsNote, { pct: f.percent((current.count / total) * 100), rank: sorted.indexOf(current) + 1, total: sorted.length }),
                },
                { label: t.geography.avgPrice, value: f.money(current.avg_price) },
              ]}
            />
          </div>
        )}
      </Card>

      <Card className="narrow geo-list" title={t.geography.tableTitle} help={t.geography.tableHelp}>
        <StateList states={sorted} selected={current?.state ?? null} onSelect={setSelected} />
      </Card>
    </div>
  );
}

/**
 * Every state as a row: a bar for its listings, its average price. The list and the map
 * share one selection: choosing a state in either marks it in both.
 */
function StateList({ states, selected, onSelect }: { states: StateStats[]; selected: string | null; onSelect: (code: string) => void }) {
  const { t, f } = useI18n();
  const region = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...states.map((s) => s.count));

  // bring the chosen row into view inside the list only: the page itself must not jump
  useEffect(() => {
    const box = region.current;
    const row = box?.querySelector<HTMLElement>('tr[data-selected="true"]');
    if (!box || !row) return;
    const head = box.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const top = row.offsetTop - head;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
  }, [selected]);

  return (
    <div ref={region} className="table-region state-list" tabIndex={0} role="region" aria-label={t.geography.tableTitle}>
      <table className="data-table">
        <caption className="visually-hidden">{t.geography.tableTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{t.geography.state}</th>
            <th scope="col" className="num">
              {t.geography.listings}
            </th>
            <th scope="col" className="num">
              {t.geography.avgPrice}
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((s) => (
            <tr key={s.state} data-selected={selected === s.state}>
              <th scope="row">
                <button type="button" className="state-pick" aria-pressed={selected === s.state} onClick={() => onSelect(s.state)}>
                  {stateName(s.state)}
                </button>
              </th>
              <td className="num">
                {f.number(s.count)}
                <span className="cell-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(1, (s.count / max) * 100)}%` }} />
                </span>
              </td>
              <td className="num">{f.money(s.avg_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
