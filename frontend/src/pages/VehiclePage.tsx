import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorState, KpiStrip, Loading, type Figure } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api, ApiError } from '../lib/api';
import { brandName, modelName, vehicleName } from '../lib/format';
import { median, retention } from '../lib/stats';
import type { MileagePoint, VehicleAnalysis } from '../lib/types';
import { useApi, type Resource } from '../lib/useApi';
import './pages.css';

const TrendChart = lazy(() => import('../charts/TrendChart'));
const LinesChart = lazy(() => import('../charts/LinesChart'));
const ScatterPlot = lazy(() => import('../charts/ScatterPlot'));

/** Width of the odometer bands whose median price is drawn over the dots. */
const MILEAGE_BAND = 20_000;

/** The value-kept curve of a vehicle: one point per model year, by years of age. */
function retentionOf(analysis: VehicleAnalysis) {
  return retention(
    analysis.history.map((h) => ({ year: h.year, price: h.avg_price, count: h.count })),
    analysis.summary.min_year_listings,
  );
}

export default function VehiclePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const brand = params.get('brand') ?? '';
  const model = params.get('model') ?? '';
  const vsBrand = params.get('vs_brand') ?? '';
  const vsModel = params.get('vs_model') ?? '';
  const shown = brand !== '' && model !== '';
  const comparing = shown && vsBrand !== '' && vsModel !== '';
  const [addingComparison, setAddingComparison] = useState(false);

  const analysis = useApi(() => api.vehicle(brand, model), [brand, model], shown);
  const mileage = useApi(() => api.mileage(brand, model), [brand, model], shown);
  const vsAnalysis = useApi(() => api.vehicle(vsBrand, vsModel), [vsBrand, vsModel], comparing);
  const vsMileage = useApi(() => api.mileage(vsBrand, vsModel), [vsBrand, vsModel], comparing);

  function update(next: Record<string, string>) {
    const merged = Object.fromEntries(
      Object.entries({ brand, model, vs_brand: vsBrand, vs_model: vsModel, ...next }).filter(([, v]) => v),
    );
    setParams(merged);
  }

  return (
    <>
      <div className="pickers">
        {/* keyed by the shown vehicle: a form starts again from the URL when it changes */}
        <Picker
          key={`a|${brand}|${model}`}
          label={t.vehicle.pickTitle}
          brand={brand}
          model={model}
          submit={t.vehicle.show}
          onShow={(b, m) => update({ brand: b, model: m })}
        />
        {shown && (comparing || addingComparison) && (
          <Picker
            key={`b|${vsBrand}|${vsModel}`}
            label={t.compare.with}
            brand={vsBrand}
            model={vsModel}
            submit={t.compare.with}
            secondary
            onShow={(b, m) => update({ vs_brand: b, vs_model: m })}
            onRemove={() => {
              setAddingComparison(false);
              update({ vs_brand: '', vs_model: '' });
            }}
          />
        )}
      </div>
      {shown && !comparing && !addingComparison && analysis.status === 'ready' && (
        <div>
          <Button onClick={() => setAddingComparison(true)}>{t.compare.add}</Button>
        </div>
      )}

      {!shown && (
        <EmptyState title={t.vehicle.emptyTitle}>
          <p>{t.vehicle.emptyBody}</p>
          <Link className="button button-secondary button-md" to="/vehicle?brand=ford&model=f-150">
            {t.vehicle.tryExample}
          </Link>
        </EmptyState>
      )}

      {shown && analysis.status === 'loading' && <Loading height={320} />}
      {shown && analysis.status === 'error' &&
        (analysis.error instanceof ApiError && analysis.error.status === 404 ? (
          <EmptyState title={vehicleName(brand, model)}>{t.vehicle.notFound}</EmptyState>
        ) : (
          <ErrorState error={analysis.error} onRetry={analysis.retry} />
        ))}

      {shown && analysis.status === 'ready' && !comparing && (
        <SingleVehicle brand={brand} model={model} analysis={analysis.data} mileage={mileage} />
      )}
      {shown && analysis.status === 'ready' && comparing && (
        <Comparison
          a={{ brand, model, analysis: analysis.data, mileage }}
          b={{ brand: vsBrand, model: vsModel, analysis: vsAnalysis, mileage: vsMileage }}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- one vehicle */

/** The key figures of a vehicle. The loss over five years comes first: it is what the page is about. */
function useFigures() {
  const { t, f, fill } = useI18n();
  return (analysis: VehicleAnalysis, points: MileagePoint[] | null): Figure[] => {
    const { summary, history } = analysis;
    const change = summary.five_year_change;
    const figures: Figure[] = [
      change
        ? { label: t.vehicle.fiveYears, value: f.signedPercent(change.pct), note: fill(t.vehicle.fiveYearsNote, { from: change.from_year, to: change.to_year }) }
        : { label: t.vehicle.fiveYears, value: '—', note: t.vehicle.fiveYearsNone },
      { label: t.vehicle.avgPrice, value: f.money(summary.avg_price), note: t.vehicle.avgPriceNote },
      { label: t.vehicle.listings, value: f.number(summary.total_samples), note: fill(t.vehicle.listingsNote, { years: history.length }) },
    ];
    if (points) {
      const m = median(points.map((p) => p.odometer));
      figures.push({ label: t.compare.medianOdometer, value: m === null ? '—' : f.number(Math.round(m)), note: t.compare.medianOdometerNote });
    }
    return figures;
  };
}

function SingleVehicle({ brand, model, analysis, mileage }: { brand: string; model: string; analysis: VehicleAnalysis; mileage: Resource<MileagePoint[]> }) {
  const { t, f, fill } = useI18n();
  const figuresFor = useFigures();
  const { summary, history } = analysis;
  const change = summary.five_year_change;
  const min = summary.min_year_listings;
  const reliable = history.filter((h) => h.count >= min);
  const thin = history.filter((h) => h.count < min).map((h) => h.year);
  const compared = change ? [change.from_year, change.to_year] : [];
  const priceHelp = fill(t.vehicle.priceHelp, { min });
  const kept = retentionOf(analysis);
  const newest = kept[0]?.year ?? '';
  const retentionHelp = fill(t.vehicle.retentionHelp, { year: newest });
  const ageTitle = (age: number) => {
    const year = kept.find((k) => k.age === age)?.year ?? '';
    return age === 0 ? fill(t.vehicle.ageNewest, { year }) : fill(age === 1 ? t.vehicle.ageOlderOne : t.vehicle.ageOlder, { years: age, year });
  };
  // the same pair of model years as the "five years older" figure, when it starts at the newest year
  const markAge = change && change.to_year === newest ? change.to_year - change.from_year : null;
  const markPoint = kept.find((k) => k.age === markAge);

  return (
    <>
      <section className="card vehicle-head" aria-labelledby="vehicle-name">
        <div className="vehicle-title">
          <p className="vehicle-brand">{brandName(brand)}</p>
          <h2 id="vehicle-name" className="vehicle-model">{modelName(model)}</h2>
          <p className="vehicle-summary">
            {change
              ? fill(t.vehicle.summary, {
                  listings: f.number(summary.total_samples),
                  from: change.from_year,
                  to: change.to_year,
                  pct: f.percent(Math.abs(change.pct), 0),
                })
              : fill(t.vehicle.summaryNoChange, { listings: f.number(summary.total_samples) })}
          </p>
        </div>
        <KpiStrip nested label={vehicleName(brand, model)} items={figuresFor(analysis, null)} />
      </section>

      <div className="grid">
        <Card
          className="wide"
          title={t.vehicle.priceTitle}
          help={priceHelp}
          footnote={thin.length > 0 ? fill(t.vehicle.lowSample, { min, years: thin.join(', ') }) : undefined}
          table={{
            caption: t.vehicle.priceTitle,
            columns: [t.overview.year, t.overview.price, t.overview.volume],
            numeric: [1, 2],
            rows: history.map((h) => [h.year, f.money(h.avg_price), f.number(h.count)]),
          }}
        >
          <Suspense fallback={<Loading height={300} />}>
            <TrendChart
              label={`${t.vehicle.priceTitle}. ${priceHelp}`}
              data={reliable.map((h) => ({
                key: h.year,
                label: String(h.year),
                value: h.avg_price,
                volume: h.count,
                title: `${t.overview.year} ${h.year}`,
                detail: [{ name: t.overview.volume, value: f.number(h.count) }],
                mark: compared.includes(h.year) ? f.money(h.avg_price) : undefined,
              }))}
              formatValue={f.money}
              formatAxis={f.compactMoney}
              valueName={t.overview.price}
              height={300}
            />
          </Suspense>
        </Card>

        <Card
          className="narrow"
          title={t.vehicle.retentionTitle}
          help={retentionHelp}
          table={{
            caption: t.vehicle.retentionTitle,
            columns: [t.overview.year, t.overview.price, t.vehicle.kept],
            numeric: [1, 2],
            rows: kept.map((k) => [k.year, f.money(k.price), f.percent(k.pct, 0)]),
          }}
        >
          {kept.length > 1 ? (
            <Suspense fallback={<Loading height={300} />}>
              <LinesChart
                label={`${t.vehicle.retentionTitle}. ${retentionHelp}`}
                series={[
                  {
                    name: t.vehicle.kept,
                    points: kept.map((k) => ({ x: k.age, y: k.pct })),
                    mark: markPoint ? { x: markPoint.age, text: fill(t.vehicle.retentionMark, { pct: f.percent(markPoint.pct, 0), years: markPoint.age }) } : undefined,
                  },
                ]}
                titleFor={ageTitle}
                formatX={String}
                formatValue={(v) => f.percent(v, 0)}
                formatAxis={(v) => f.percent(v, 0)}
                baseline={100}
                height={300}
              />
            </Suspense>
          ) : (
            <p className="card-help">{t.vehicle.fiveYearsNone}</p>
          )}
        </Card>

        <MileagePanel
          title={t.vehicle.mileageTitle}
          help={fill(t.vehicle.mileageHelp, { bin: f.number(MILEAGE_BAND) })}
          series={[{ name: vehicleName(brand, model), resource: mileage }]}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- two vehicles */

interface Side {
  brand: string;
  model: string;
  mileage: Resource<MileagePoint[]>;
}

function Comparison({ a, b }: { a: Side & { analysis: VehicleAnalysis }; b: Side & { analysis: Resource<VehicleAnalysis> } }) {
  const { t, f, fill } = useI18n();
  const figuresFor = useFigures();
  const nameA = vehicleName(a.brand, a.model);
  const nameB = vehicleName(b.brand, b.model);

  if (b.analysis.status === 'loading') return <Loading height={320} />;
  if (b.analysis.status === 'error') {
    return b.analysis.error instanceof ApiError && b.analysis.error.status === 404 ? (
      <EmptyState title={nameB}>{t.compare.notFound}</EmptyState>
    ) : (
      <ErrorState error={b.analysis.error} onRetry={b.analysis.retry} />
    );
  }

  const analysisB = b.analysis.data;
  const pricePoints = (analysis: VehicleAnalysis) =>
    analysis.history.filter((h) => h.count >= analysis.summary.min_year_listings).map((h) => ({ x: h.year, y: h.avg_price }));
  const keptA = retentionOf(a.analysis);
  const keptB = retentionOf(analysisB);
  const priceHelp = fill(t.compare.priceHelp, { min: a.analysis.summary.min_year_listings });
  const ageTitle = (age: number) => (age === 0 ? t.compare.ageNewest : fill(age === 1 ? t.compare.ageOlderOne : t.compare.ageOlder, { years: age }));
  const ages = [...new Set([...keptA, ...keptB].map((k) => k.age))].sort((x, y) => x - y);
  const pointsOf = (resource: Resource<MileagePoint[]>) => (resource.status === 'ready' ? resource.data : null);
  const sides = [
    { key: 'a', side: a, analysis: a.analysis, primary: true },
    { key: 'b', side: b, analysis: analysisB, primary: false },
  ];

  return (
    <>
      <section className="compare-head" aria-label={t.compare.title}>
        {sides.map(({ key, side, analysis, primary }) => (
          <div key={key} className={`card compare-card${primary ? ' is-primary' : ''}`}>
            <div className="compare-title">
              <span className="compare-key" aria-hidden="true" />
              <div>
                <p className="vehicle-brand">{brandName(side.brand)}</p>
                <h2 className="compare-model">{modelName(side.model)}</h2>
              </div>
            </div>
            <KpiStrip nested lead={false} columns={2} label={vehicleName(side.brand, side.model)} items={figuresFor(analysis, pointsOf(side.mileage))} />
          </div>
        ))}
      </section>

      <div className="grid">
        <Card
          className="wide"
          title={t.compare.priceTitle}
          help={priceHelp}
          table={{
            caption: t.compare.priceTitle,
            columns: [t.overview.year, nameA, nameB],
            numeric: [1, 2],
            rows: [...new Set([...a.analysis.history, ...analysisB.history].map((h) => h.year))]
              .sort((x, y) => x - y)
              .map((year) => {
                const pa = a.analysis.history.find((h) => h.year === year);
                const pb = analysisB.history.find((h) => h.year === year);
                return [year, pa ? f.money(pa.avg_price) : '—', pb ? f.money(pb.avg_price) : '—'];
              }),
          }}
        >
          <Suspense fallback={<Loading height={300} />}>
            <LinesChart
              label={`${t.compare.priceTitle}. ${priceHelp}`}
              series={[
                { name: nameA, points: pricePoints(a.analysis) },
                { name: nameB, points: pricePoints(analysisB) },
              ]}
              titleFor={(year) => `${t.overview.year} ${year}`}
              formatX={String}
              formatValue={f.money}
              formatAxis={f.compactMoney}
              height={300}
            />
          </Suspense>
        </Card>

        <Card
          className="narrow"
          title={t.vehicle.retentionTitle}
          help={t.compare.retentionHelp}
          table={{
            caption: t.vehicle.retentionTitle,
            columns: [t.compare.age, nameA, nameB],
            numeric: [0, 1, 2],
            rows: ages.map((age) => {
              const ka = keptA.find((k) => k.age === age);
              const kb = keptB.find((k) => k.age === age);
              return [age, ka ? f.percent(ka.pct, 0) : '—', kb ? f.percent(kb.pct, 0) : '—'];
            }),
          }}
        >
          <Suspense fallback={<Loading height={300} />}>
            <LinesChart
              label={`${t.vehicle.retentionTitle}. ${t.compare.retentionHelp}`}
              series={[
                { name: nameA, points: keptA.map((k) => ({ x: k.age, y: k.pct })) },
                { name: nameB, points: keptB.map((k) => ({ x: k.age, y: k.pct })) },
              ]}
              titleFor={ageTitle}
              formatX={String}
              formatValue={(v) => f.percent(v, 0)}
              formatAxis={(v) => f.percent(v, 0)}
              baseline={100}
              height={300}
            />
          </Suspense>
        </Card>

        <MileagePanel
          title={t.compare.mileageTitle}
          help={fill(t.compare.mileageHelp, { bin: f.number(MILEAGE_BAND) })}
          series={[
            { name: nameA, resource: a.mileage },
            { name: nameB, resource: b.mileage },
          ]}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- shared */

interface MileageSeries {
  name: string;
  resource: Resource<MileagePoint[]>;
}

function MileagePanel({ title, help, series }: { title: string; help: string; series: MileageSeries[] }) {
  const { t, f, fill } = useI18n();
  const failed = series.find((s) => s.resource.status === 'error');
  const ready = series.every((s) => s.resource.status === 'ready');
  const data = series.map((s) => ({ name: s.name, points: s.resource.status === 'ready' ? s.resource.data : [] }));
  const empty = ready && data.every((d) => d.points.length === 0);
  const single = series.length === 1;

  return (
    <Card
      className="span-all"
      title={title}
      help={help}
      table={
        ready && !empty
          ? {
              caption: title,
              columns: single ? [t.vehicle.odometer, t.vehicle.price] : [t.compare.title, t.vehicle.odometer, t.vehicle.price],
              numeric: single ? [0, 1] : [1, 2],
              rows: data.flatMap((d) =>
                d.points.map((p) => (single ? [f.number(p.odometer), f.money(p.price)] : [d.name, f.number(p.odometer), f.money(p.price)])),
              ),
            }
          : undefined
      }
    >
      {failed ? (
        <ErrorState error={failed.resource.error} onRetry={failed.resource.retry} height={300} />
      ) : !ready ? (
        <Loading height={300} />
      ) : empty ? (
        <p className="card-help">{t.vehicle.noMileage}</p>
      ) : (
        <Suspense fallback={<Loading height={300} />}>
          <ScatterPlot
            label={`${title}. ${help}`}
            series={data.map((d) => ({ name: d.name, points: d.points.map((p) => ({ x: p.odometer, y: p.price })) }))}
            binSize={MILEAGE_BAND}
            medianName={t.vehicle.medianPrice}
            countName={t.overview.volume}
            rangeTitle={(from, to) => fill(t.overview.milesRange, { from: f.number(from), to: f.number(to) })}
            formatX={(v) => `${f.number(Math.round(v / 1000))}k`}
            formatY={f.money}
            formatAxisY={f.compactMoney}
            formatCount={f.number}
            height={300}
          />
        </Suspense>
      )}
    </Card>
  );
}

interface PickerProps {
  label: string;
  brand: string;
  model: string;
  submit: string;
  onShow: (brand: string, model: string) => void;
  onRemove?: () => void;
  secondary?: boolean;
}

/** Brand and model choice. It keeps its own draft until submitted; the URL holds what is shown. */
function Picker({ label, brand, model, submit, onShow, onRemove, secondary = false }: PickerProps) {
  const { t } = useI18n();
  const [draftBrand, setDraftBrand] = useState(brand);
  const [draftModel, setDraftModel] = useState(model);
  const brands = useApi(api.brands, []);
  const models = useApi(() => api.models(draftBrand), [draftBrand], draftBrand !== '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (draftBrand && draftModel) onShow(draftBrand, draftModel);
  }

  return (
    <form className={`card picker${secondary ? ' is-secondary' : ''}`} onSubmit={onSubmit} aria-label={label}>
      <p className="picker-title">{label}</p>
      <label className="field">
        {t.vehicle.brand}
        <select
          value={draftBrand}
          onChange={(e) => {
            setDraftBrand(e.target.value);
            setDraftModel('');
          }}
          disabled={brands.status !== 'ready'}
        >
          <option value="">{brands.status === 'ready' ? t.vehicle.chooseBrand : t.vehicle.loadingOptions}</option>
          {brands.status === 'ready' &&
            brands.data.map((b) => (
              <option key={b} value={b}>
                {brandName(b)}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        {t.vehicle.model}
        <select value={draftModel} onChange={(e) => setDraftModel(e.target.value)} disabled={!draftBrand || models.status !== 'ready'}>
          <option value="">{draftBrand && models.status === 'loading' ? t.vehicle.loadingOptions : t.vehicle.chooseModel}</option>
          {draftBrand &&
            models.status === 'ready' &&
            models.data.map((m) => (
              <option key={m} value={m}>
                {modelName(m)}
              </option>
            ))}
        </select>
      </label>
      <div className="picker-actions">
        <Button type="submit" variant={secondary ? 'secondary' : 'primary'} disabled={!draftBrand || !draftModel}>
          {submit}
        </Button>
        {onRemove && (
          <Button variant="quiet" onClick={onRemove}>
            {t.compare.remove}
          </Button>
        )}
      </div>
      {!secondary && <p className="picker-note">{t.vehicle.modelsNote}</p>}
    </form>
  );
}
