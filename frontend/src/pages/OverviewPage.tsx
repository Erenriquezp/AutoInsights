import { lazy, Suspense } from 'react';
import { BarList, EmptyState, ErrorState, KpiBand, Loading, Panel, type Readout } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import { brandName } from '../lib/format';
import { useApi } from '../lib/useApi';
import './pages.css';

const ColumnChart = lazy(() => import('../charts/ColumnChart'));

/** Market-wide model years below this many listings are too thin to plot (2022: 26 listings). */
const MIN_MARKET_YEAR_LISTINGS = 100;

export default function OverviewPage() {
  const { t, f, fill } = useI18n();
  const stats = useApi(api.stats, []);
  const trend = useApi(api.trend, []);
  const conditions = useApi(api.conditions, []);
  const histogram = useApi(api.histogram, []);
  const brands = useApi(() => api.topBrands(10), []);
  const mileage = useApi(api.mileageDistribution, []);

  if (stats.status === 'ready' && stats.data.total_vehicles === 0) {
    return <EmptyState title={t.states.empty}>{t.states.noGold}</EmptyState>;
  }

  const readouts: Readout[] | null =
    stats.status === 'ready' && trend.status === 'ready'
      ? [
          { label: t.overview.listings, value: f.number(stats.data.total_vehicles), note: t.overview.listingsNote, evidence: true },
          { label: t.overview.avgPrice, value: f.money(stats.data.avg_market_price), note: t.overview.avgPriceNote },
          { label: t.overview.brands, value: f.number(stats.data.total_brands), note: fill(t.overview.brandsNote, { models: f.number(stats.data.total_models) }) },
          {
            label: t.overview.years,
            value: `${stats.data.oldest_year}–${stats.data.newest_year}`,
            note: fill(t.overview.yearsNote, {
              year: [...trend.data].sort((a, b) => b.volume_year - a.volume_year)[0]?.year ?? '',
            }),
          },
        ]
      : null;

  const years = trend.status === 'ready' ? trend.data.filter((y) => y.volume_year >= MIN_MARKET_YEAR_LISTINGS) : [];
  const lastYears = years.slice(-3).map((y) => y.year);
  const totalConditions = conditions.status === 'ready' ? conditions.data.reduce((sum, c) => sum + c.count, 0) : 0;
  const medianBand =
    mileage.status === 'ready' && mileage.data.median_odometer !== null
      ? Math.floor(mileage.data.median_odometer / mileage.data.bucket_size) * mileage.data.bucket_size
      : undefined;
  const peakBand =
    histogram.status === 'ready' ? [...histogram.data].sort((a, b) => b.count - a.count)[0]?.price_range : undefined;

  return (
    <>
      {readouts ? (
        <KpiBand label={t.overview.kpis} items={readouts} />
      ) : stats.status === 'error' ? (
        <ErrorState error={stats.error} onRetry={stats.retry} height={120} />
      ) : (
        <Loading height={128} />
      )}

      <div className="overview-grid">
        <Panel
          className="area-trend"
          title={t.overview.trendTitle}
          help={`${fill(t.overview.trendHelp, { min: MIN_MARKET_YEAR_LISTINGS })} ${t.overview.trendHighlight}`}
          table={
            trend.status === 'ready'
              ? {
                  caption: t.overview.trendTitle,
                  columns: [t.overview.year, t.overview.price, t.overview.volume],
                  numeric: [1, 2],
                  rows: years.map((y) => [y.year, f.money(y.avg_price_year), f.number(y.volume_year)]),
                }
              : undefined
          }
        >
          {trend.status === 'ready' ? (
            <Suspense fallback={<Loading height={260} />}>
              <ColumnChart
                data={years.map((y) => ({ key: y.year, label: String(y.year), value: y.avg_price_year, highlight: lastYears.includes(y.year) }))}
                formatValue={f.money}
                formatAxis={f.compactMoney}
                valueName={t.overview.price}
                labelEvery={5}
              />
            </Suspense>
          ) : trend.status === 'error' ? (
            <ErrorState error={trend.error} onRetry={trend.retry} height={260} />
          ) : (
            <Loading height={260} />
          )}
        </Panel>

        <Panel
          className="area-condition"
          title={t.overview.conditionTitle}
          help={t.overview.conditionHelp}
          table={
            conditions.status === 'ready'
              ? {
                  caption: t.overview.conditionTitle,
                  columns: [t.overview.condition, t.overview.volume, t.overview.share],
                  numeric: [1, 2],
                  rows: conditions.data.map((c) => [
                    t.conditions[c.condition] ?? c.condition,
                    f.number(c.count),
                    f.percent((c.count / totalConditions) * 100),
                  ]),
                }
              : undefined
          }
        >
          {conditions.status === 'ready' ? (
            <BarList
              label={t.overview.conditionTitle}
              items={conditions.data.map((c) => ({
                label: t.conditions[c.condition] ?? c.condition,
                value: c.count,
                // shares under 1 % keep a decimal so they never read as "0 %"
                display: f.percent((c.count / totalConditions) * 100, c.count / totalConditions < 0.01 ? 1 : 0),
                muted: c.condition === 'unknown',
              }))}
            />
          ) : conditions.status === 'error' ? (
            <ErrorState error={conditions.error} onRetry={conditions.retry} />
          ) : (
            <Loading />
          )}
        </Panel>
        <Panel
          className="area-price"
          title={t.overview.histTitle}
          help={t.overview.histHelp}
          table={
            histogram.status === 'ready'
              ? {
                  caption: t.overview.histTitle,
                  columns: [t.overview.band, t.overview.volume],
                  numeric: [1],
                  rows: histogram.data.map((b) => [`${f.money(b.price_range)}–${f.money(b.price_range + 2000)}`, f.number(b.count)]),
                }
              : undefined
          }
        >
          {histogram.status === 'ready' ? (
            <Suspense fallback={<Loading height={240} />}>
              <ColumnChart
                data={histogram.data.map((b) => ({
                  key: b.price_range,
                  label: f.compactMoney(b.price_range),
                  value: b.count,
                  highlight: b.price_range === peakBand,
                }))}
                formatValue={f.number}
                formatAxis={f.number}
                valueName={t.overview.volume}
                height={240}
                labelEvery={5}
              />
            </Suspense>
          ) : histogram.status === 'error' ? (
            <ErrorState error={histogram.error} onRetry={histogram.retry} height={240} />
          ) : (
            <Loading height={240} />
          )}
        </Panel>

        <Panel
          className="area-mileage"
          title={t.overview.mileageTitle}
          help={fill(t.overview.mileageHelp, { median: mileage.status === 'ready' && mileage.data.median_odometer !== null ? f.number(mileage.data.median_odometer) : '—' })}
          table={
            mileage.status === 'ready'
              ? {
                  caption: t.overview.mileageTitle,
                  columns: [t.overview.mileageBand, t.overview.volume],
                  numeric: [1],
                  rows: mileage.data.buckets.map((b) => [
                    `${f.number(b.odometer_range)}–${f.number(b.odometer_range + mileage.data.bucket_size)}`,
                    f.number(b.count),
                  ]),
                }
              : undefined
          }
        >
          {mileage.status === 'ready' ? (
            <Suspense fallback={<Loading height={240} />}>
              <ColumnChart
                data={mileage.data.buckets.map((b) => ({
                  key: b.odometer_range,
                  label: `${f.number(b.odometer_range / 1000)}k`,
                  value: b.count,
                  highlight: b.odometer_range === medianBand,
                }))}
                formatValue={f.number}
                formatAxis={f.number}
                valueName={t.overview.volume}
                height={240}
                labelEvery={5}
              />
            </Suspense>
          ) : mileage.status === 'error' ? (
            <ErrorState error={mileage.error} onRetry={mileage.retry} height={240} />
          ) : (
            <Loading height={240} />
          )}
        </Panel>

        <Panel className="area-brands" title={t.overview.brandsTitle} help={t.overview.brandsHelp}>
          {brands.status === 'ready' ? (
            <BarList
              label={t.overview.brandsTitle}
              items={brands.data.map((b, i) => ({
                label: brandName(b.manufacturer),
                value: b.count,
                display: f.number(b.count),
                highlight: i === 0,
              }))}
            />
          ) : brands.status === 'error' ? (
            <ErrorState error={brands.error} onRetry={brands.retry} />
          ) : (
            <Loading />
          )}
        </Panel>
      </div>
    </>
  );
}
