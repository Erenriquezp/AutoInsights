import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, KpiBand, Loading, Panel, type Readout } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api, ApiError } from '../lib/api';
import { brandName, modelName, vehicleName } from '../lib/format';
import type { MileagePoint, VehicleAnalysis } from '../lib/types';
import { useApi, type Resource } from '../lib/useApi';
import './pages.css';

const ColumnChart = lazy(() => import('../charts/ColumnChart'));
const CompareLineChart = lazy(() => import('../charts/CompareLineChart'));
const ScatterPlot = lazy(() => import('../charts/ScatterPlot'));

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

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
          <button type="button" className="btn" onClick={() => setAddingComparison(true)}>
            {t.compare.add}
          </button>
        </div>
      )}

      {!shown && (
        <EmptyState title={t.vehicle.emptyTitle}>
          <p>{t.vehicle.emptyBody}</p>
          <Link className="btn" to="/vehicle?brand=ford&model=f-150">
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

function useReadouts() {
  const { t, f, fill } = useI18n();
  return (analysis: VehicleAnalysis, points: MileagePoint[] | null, evidence: boolean): Readout[] => {
    const { summary, history } = analysis;
    const change = summary.five_year_change;
    const readouts: Readout[] = [
      { label: t.vehicle.avgPrice, value: f.money(summary.avg_price), note: t.vehicle.avgPriceNote },
      { label: t.vehicle.listings, value: f.number(summary.total_samples), note: fill(t.vehicle.listingsNote, { years: history.length }) },
      change
        ? { label: t.vehicle.fiveYears, value: f.signedPercent(change.pct), note: fill(t.vehicle.fiveYearsNote, { from: change.from_year, to: change.to_year }), evidence }
        : { label: t.vehicle.fiveYears, value: '—', note: t.vehicle.fiveYearsNone },
    ];
    if (points) {
      const m = median(points.map((p) => p.odometer));
      readouts.push({ label: t.compare.medianOdometer, value: m === null ? '—' : f.number(Math.round(m)), note: t.compare.medianOdometerNote });
    }
    return readouts;
  };
}

function SingleVehicle({ brand, model, analysis, mileage }: { brand: string; model: string; analysis: VehicleAnalysis; mileage: Resource<MileagePoint[]> }) {
  const { t, f, fill } = useI18n();
  const readoutsFor = useReadouts();
  const { summary, history } = analysis;
  const change = summary.five_year_change;
  const min = summary.min_year_listings;
  const reliable = history.filter((h) => h.count >= min);
  const thin = history.filter((h) => h.count < min).map((h) => h.year);
  const compared = change ? [change.from_year, change.to_year] : [];

  return (
    <>
      <section className="vehicle-head" aria-labelledby="vehicle-name">
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
        <KpiBand label={vehicleName(brand, model)} items={readoutsFor(analysis, null, true)} />
      </section>

      <div className="grid">
        <Panel
          className="wide"
          title={t.vehicle.priceTitle}
          help={fill(t.vehicle.priceHelp, { min })}
          footnote={thin.length > 0 ? fill(t.vehicle.lowSample, { min, years: thin.join(', ') }) : undefined}
          table={{
            caption: t.vehicle.priceTitle,
            columns: [t.overview.year, t.overview.price, t.overview.volume],
            numeric: [1, 2],
            rows: history.map((h) => [h.year, f.money(h.avg_price), f.number(h.count)]),
          }}
        >
          <Suspense fallback={<Loading height={280} />}>
            <ColumnChart
              data={reliable.map((h) => ({ key: h.year, label: String(h.year), value: h.avg_price, highlight: compared.includes(h.year) }))}
              formatValue={f.money}
              formatAxis={f.compactMoney}
              valueName={t.overview.price}
              height={280}
              labelEvery={reliable.length > 16 ? 3 : 1}
            />
          </Suspense>
        </Panel>

        <MileagePanel
          title={t.vehicle.mileageTitle}
          help={t.vehicle.mileageHelp}
          series={[{ name: vehicleName(brand, model), resource: mileage, primary: true }]}
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
  const readoutsFor = useReadouts();
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
  const reliableValues = (analysis: VehicleAnalysis) =>
    new Map(analysis.history.filter((h) => h.count >= analysis.summary.min_year_listings).map((h) => [h.year, h.avg_price]));
  const pointsOf = (resource: Resource<MileagePoint[]>) => (resource.status === 'ready' ? resource.data : null);
  const sides = [
    { key: 'a', side: a, analysis: a.analysis, primary: true },
    { key: 'b', side: b, analysis: analysisB, primary: false },
  ];

  return (
    <>
      <section className="compare-head" aria-label={t.compare.title}>
        {sides.map(({ key, side, analysis, primary }) => (
          <div key={key} className={`compare-card${primary ? ' is-primary' : ''}`}>
            <div className="compare-title">
              <span className="compare-key" aria-hidden="true" />
              <div>
                <p className="vehicle-brand">{brandName(side.brand)}</p>
                <h2 className="compare-model">{modelName(side.model)}</h2>
              </div>
            </div>
            <KpiBand label={vehicleName(side.brand, side.model)} items={readoutsFor(analysis, pointsOf(side.mileage), primary)} />
          </div>
        ))}
      </section>

      <div className="grid">
        <Panel
          className="wide"
          title={t.compare.priceTitle}
          help={fill(t.compare.priceHelp, { min: a.analysis.summary.min_year_listings })}
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
            <CompareLineChart
              primary={{ name: nameA, values: reliableValues(a.analysis) }}
              secondary={{ name: nameB, values: reliableValues(analysisB) }}
              formatValue={f.money}
              formatAxis={f.compactMoney}
            />
          </Suspense>
        </Panel>

        <MileagePanel
          title={t.compare.mileageTitle}
          help={t.compare.mileageHelp}
          series={[
            { name: nameA, resource: a.mileage, primary: true },
            { name: nameB, resource: b.mileage, primary: false },
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
  primary: boolean;
}

function MileagePanel({ title, help, series }: { title: string; help: string; series: MileageSeries[] }) {
  const { t, f } = useI18n();
  const failed = series.find((s) => s.resource.status === 'error');
  const ready = series.every((s) => s.resource.status === 'ready');
  const data = series.map((s) => ({ name: s.name, primary: s.primary, points: s.resource.status === 'ready' ? s.resource.data : [] }));
  const empty = ready && data.every((d) => d.points.length === 0);
  const single = series.length === 1;

  return (
    <Panel
      className="narrow"
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
        <ErrorState error={failed.resource.error} onRetry={failed.resource.retry} height={280} />
      ) : !ready ? (
        <Loading height={280} />
      ) : empty ? (
        <p className="panel-help">{t.vehicle.noMileage}</p>
      ) : (
        <Suspense fallback={<Loading height={280} />}>
          <ScatterPlot
            series={data}
            xName={t.vehicle.odometer}
            yName={t.vehicle.price}
            formatX={(v) => `${f.number(Math.round(v / 1000))}k`}
            formatY={f.compactMoney}
            height={280}
          />
        </Suspense>
      )}
    </Panel>
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
    <form className={`panel picker${secondary ? ' is-secondary' : ''}`} onSubmit={onSubmit} aria-label={label}>
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
        <button type="submit" className={secondary ? 'btn' : 'btn btn-primary'} disabled={!draftBrand || !draftModel}>
          {submit}
        </button>
        {onRemove && (
          <button type="button" className="text-button" onClick={onRemove}>
            {t.compare.remove}
          </button>
        )}
      </div>
      {!secondary && <p className="picker-note">{t.vehicle.modelsNote}</p>}
    </form>
  );
}
