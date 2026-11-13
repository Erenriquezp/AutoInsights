import { lazy, Suspense } from 'react';
import type { SharePart } from '../charts/StackedShare';
import StackedShare from '../charts/StackedShare';
import { BarList, Card, EmptyState, ErrorState, KpiStrip, Loading, type Figure } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api } from '../lib/api';
import { brandName } from '../lib/format';
import { histogramMedian } from '../lib/stats';
import { useApi } from '../lib/useApi';
import './pages.css';

const TrendChart = lazy(() => import('../charts/TrendChart'));
const Histogram = lazy(() => import('../charts/Histogram'));

/** Market-wide model years below this many listings are too thin to plot (2022: 26 listings). */
const MIN_MARKET_YEAR_LISTINGS = 100;

/** Rows the ETL read from the source file, before cleaning (the API serves only the clean count). */
const RAW_LISTINGS = 426_880;

/** Width of a price band in the histogram the API returns. */
const PRICE_BAND = 2000;

/** Conditions from best to worst: the order of the scale. Anything else is absence of data. */
const CONDITION_ORDER = ['new', 'like new', 'excellent', 'good', 'fair', 'salvage'];

export default function OverviewPage() {
  const { t, f, fill } = useI18n();
  const stats = useApi(api.stats, []);
  const trend = useApi(api.trend, []);
  const conditions = useApi(api.conditions, []);
  const histogram = useApi(api.histogram, []);
  const brands = useApi(() => api.topBrands(10), []);
  const mileage = useApi(api.mileageDistribution, []);

  // when nothing could be loaded, say it once instead of once per card
  const resources = [stats, trend, conditions, histogram, brands, mileage];
  if (resources.every((r) => r.status === 'error')) {
    return (
      <Card>
        <ErrorState error={stats.error} onRetry={() => resources.forEach((r) => r.retry())} height={320} />
      </Card>
    );
  }

  if (stats.status === 'ready' && stats.data.total_vehicles === 0) {
    return <EmptyState title={t.states.empty}>{t.states.noGold}</EmptyState>;
  }

  const figures: Figure[] | null =
    stats.status === 'ready' && trend.status === 'ready'
      ? [
          {
            label: t.overview.listings,
            value: f.number(stats.data.total_vehicles),
            note: fill(t.overview.listingsNote, {
              pct: f.percent((stats.data.total_vehicles / RAW_LISTINGS) * 100, 0),
              raw: f.number(RAW_LISTINGS),
            }),
            meter: stats.data.total_vehicles / RAW_LISTINGS,
          },
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
  const trendHelp = fill(t.overview.trendHelp, { min: MIN_MARKET_YEAR_LISTINGS });

  const priceMedian =
    histogram.status === 'ready' ? histogramMedian(histogram.data.map((b) => ({ start: b.price_range, count: b.count })), PRICE_BAND) : null;

  // conditions in the order of the scale; whatever is not on it (the seller said nothing) goes last
  const totalConditions = conditions.status === 'ready' ? conditions.data.reduce((sum, c) => sum + c.count, 0) : 0;
  const share = (count: number) => f.percent((count / totalConditions) * 100, count / totalConditions < 0.01 ? 1 : 0);
  const parts: SharePart[] =
    conditions.status === 'ready'
      ? [...conditions.data]
          .sort((a, b) => {
            const rank = (c: string) => (CONDITION_ORDER.includes(c) ? CONDITION_ORDER.indexOf(c) : CONDITION_ORDER.length);
            return rank(a.condition) - rank(b.condition);
          })
          .map((c) => ({
            key: c.condition,
            name: t.conditions[c.condition] ?? c.condition,
            value: c.count,
            share: share(c.count),
            amount: f.number(c.count),
            tone: CONDITION_ORDER.includes(c.condition) ? ((CONDITION_ORDER.indexOf(c.condition) + 1) as SharePart['tone']) : 'missing',
          }))
      : [];
  const missing = parts.filter((p) => p.tone === 'missing').reduce((sum, p) => sum + p.value, 0);
  const conditionHelp = t.overview.conditionHelp;
  const stated = totalConditions ? f.percent(((totalConditions - missing) / totalConditions) * 100, 0) : '—';
  const newest = years[years.length - 1];
  const topBrand = brands.status === 'ready' ? brands.data[0] : undefined;

  return (
    <>
      {figures ? (
        <KpiStrip label={t.overview.kpis} items={figures} />
      ) : stats.status === 'error' ? (
        <ErrorState error={stats.error} onRetry={stats.retry} height={120} />
      ) : (
        <Loading height={128} />
      )}

      <div className="overview-grid">
        <Card
          className="area-trend"
          title={t.overview.trendTitle}
          figure={newest ? { value: f.money(newest.avg_price_year), label: fill(t.overview.trendFigure, { year: newest.year }) } : undefined}
          help={trendHelp}
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
            <Suspense fallback={<Loading height={220} />}>
              <TrendChart
                label={`${t.overview.trendTitle}. ${trendHelp}`}
                data={years.map((y) => ({
                  key: y.year,
                  label: String(y.year),
                  value: y.avg_price_year,
                  volume: y.volume_year,
                  title: `${t.overview.year} ${y.year}`,
                  detail: [{ name: t.overview.volume, value: f.number(y.volume_year) }],
                }))}
                formatValue={f.money}
                formatAxis={f.compactMoney}
                valueName={t.overview.price}
                height={220}
              />
            </Suspense>
          ) : trend.status === 'error' ? (
            <ErrorState error={trend.error} onRetry={trend.retry} height={220} />
          ) : (
            <Loading height={220} />
          )}
        </Card>

        <Card
          className="area-condition"
          title={t.overview.conditionTitle}
          figure={conditions.status === 'ready' ? { value: stated, label: t.overview.conditionFigure } : undefined}
          help={conditionHelp}
          table={
            conditions.status === 'ready'
              ? {
                  caption: t.overview.conditionTitle,
                  columns: [t.overview.condition, t.overview.volume, t.overview.share],
                  numeric: [1, 2],
                  rows: parts.map((p) => [p.name, p.amount, f.percent((p.value / totalConditions) * 100)]),
                }
              : undefined
          }
        >
          {conditions.status === 'ready' ? (
            <StackedShare label={t.overview.conditionTitle} parts={parts} />
          ) : conditions.status === 'error' ? (
            <ErrorState error={conditions.error} onRetry={conditions.retry} />
          ) : (
            <Loading />
          )}
        </Card>

        <Card
          className="area-price"
          title={t.overview.histTitle}
          figure={priceMedian !== null ? { value: f.money(Math.round(priceMedian / 100) * 100), label: t.overview.histFigure } : undefined}
          help={t.overview.histHelp}
          table={
            histogram.status === 'ready'
              ? {
                  caption: t.overview.histTitle,
                  columns: [t.overview.band, t.overview.volume],
                  numeric: [1],
                  rows: histogram.data.map((b) => [`${f.money(b.price_range)}–${f.money(b.price_range + PRICE_BAND)}`, f.number(b.count)]),
                }
              : undefined
          }
        >
          {histogram.status === 'ready' ? (
            <Suspense fallback={<Loading height={180} />}>
              <Histogram
                label={`${t.overview.histTitle}. ${t.overview.histHelp}`}
                bins={histogram.data.map((b) => ({
                  start: b.price_range,
                  count: b.count,
                  title: fill(t.overview.rangeTo, { from: f.money(b.price_range), to: f.money(b.price_range + PRICE_BAND) }),
                }))}
                countName={t.overview.volume}
                formatCount={f.number}
                formatTick={f.compactMoney}
                tickEvery={20_000}
                marker={priceMedian !== null ? { value: priceMedian, text: t.overview.medianMark } : undefined}
                height={180}
              />
            </Suspense>
          ) : histogram.status === 'error' ? (
            <ErrorState error={histogram.error} onRetry={histogram.retry} height={180} />
          ) : (
            <Loading height={180} />
          )}
        </Card>

        <Card
          className="area-mileage"
          title={t.overview.mileageTitle}
          figure={
            mileage.status === 'ready' && mileage.data.median_odometer !== null
              ? { value: f.number(mileage.data.median_odometer), label: t.overview.mileageFigure }
              : undefined
          }
          help={t.overview.mileageHelp}
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
            <Suspense fallback={<Loading height={180} />}>
              <Histogram
                label={`${t.overview.mileageTitle}. ${t.overview.mileageHelp}`}
                bins={mileage.data.buckets.map((b) => ({
                  start: b.odometer_range,
                  count: b.count,
                  title: fill(t.overview.milesRange, { from: f.number(b.odometer_range), to: f.number(b.odometer_range + mileage.data.bucket_size) }),
                }))}
                countName={t.overview.volume}
                formatCount={f.number}
                formatTick={(v) => `${f.number(v / 1000)}k`}
                tickEvery={50_000}
                marker={
                  mileage.data.median_odometer !== null
                    ? { value: mileage.data.median_odometer, text: t.overview.medianMark }
                    : undefined
                }
                height={180}
              />
            </Suspense>
          ) : mileage.status === 'error' ? (
            <ErrorState error={mileage.error} onRetry={mileage.retry} height={180} />
          ) : (
            <Loading height={180} />
          )}
        </Card>

        <Card
          className="area-brands"
          title={t.overview.brandsTitle}
          figure={
            topBrand && stats.status === 'ready'
              ? { value: brandName(topBrand.manufacturer), label: fill(t.overview.brandsFigure, { pct: f.percent((topBrand.count / stats.data.total_vehicles) * 100, 0) }) }
              : undefined
          }
          help={t.overview.brandsHelp}
        >
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
        </Card>
      </div>
    </>
  );
}
