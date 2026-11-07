import { useMemo, useState } from 'react';
import TileMap, { type TileValue } from '../charts/TileMap';
import { STATE_NAMES } from '../charts/usStates';
import { DataTable, ErrorState, KpiBand, Loading, Panel } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';

export default function GeographyPage() {
  const { t, f } = useI18n();
  const states = useApi(api.states, []);
  const [selected, setSelected] = useState<string | null>(null);

  const total = states.status === 'ready' ? states.data.reduce((sum, s) => sum + s.count, 0) : 0;
  const sorted = useMemo(
    () => (states.status === 'ready' ? [...states.data].sort((a, b) => b.count - a.count) : []),
    [states],
  );
  const values = useMemo(
    () =>
      Object.fromEntries(
        sorted.map((s): [string, TileValue] => [
          s.state,
          { value: s.count, label: `${f.number(s.count)} ${t.geography.listings.toLowerCase()}, ${f.money(s.avg_price)}` },
        ]),
      ),
    [sorted, f, t],
  );

  if (states.status === 'loading') return <Loading height={420} />;
  if (states.status === 'error') return <ErrorState error={states.error} onRetry={states.retry} height={420} />;

  const current = sorted.find((s) => s.state === (selected ?? sorted[0]?.state));

  return (
    <div className="grid">
      <Panel className="wide" title={t.geography.mapTitle} help={t.geography.mapHelp}>
        <TileMap
          values={values}
          selected={current?.state ?? null}
          onSelect={setSelected}
          label={t.geography.mapTitle}
          legend={{ few: t.geography.legendFew, many: t.geography.legendMany }}
        />
        {current && (
          <div className="geo-selected" aria-live="polite">
            <KpiBand
              label={t.geography.selected}
              items={[
                { label: t.geography.selected, value: STATE_NAMES[current.state] ?? current.state.toUpperCase(), text: true },
                { label: t.geography.listings, value: f.number(current.count), note: `${f.percent((current.count / total) * 100)}, #${sorted.indexOf(current) + 1}`, evidence: true },
                { label: t.geography.avgPrice, value: f.money(current.avg_price) },
              ]}
            />
          </div>
        )}
      </Panel>

      <Panel className="narrow" title={t.geography.tableTitle} help={t.geography.tableHelp}>
        <div className="geo-table">
          <DataTable
            caption={t.geography.tableTitle}
            columns={[t.geography.state, t.geography.listings, t.geography.avgPrice]}
            numeric={[1, 2]}
            rows={sorted.map((s) => [STATE_NAMES[s.state] ?? s.state.toUpperCase(), f.number(s.count), f.money(s.avg_price)])}
          />
        </div>
      </Panel>
    </div>
  );
}
