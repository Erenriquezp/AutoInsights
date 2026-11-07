import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, KpiBand, Loading, Panel, type Readout } from '../components/ui';
import { useI18n } from '../i18n/context';
import { api, ApiError } from '../lib/api';
import { brandName, modelName, vehicleName } from '../lib/format';
import { useApi } from '../lib/useApi';
import './pages.css';

const ColumnChart = lazy(() => import('../charts/ColumnChart'));
const ScatterPlot = lazy(() => import('../charts/ScatterPlot'));

export default function VehiclePage() {
  const { t, f, fill } = useI18n();
  const [params, setParams] = useSearchParams();
  const brand = params.get('brand') ?? '';
  const model = params.get('model') ?? '';
  const shown = brand !== '' && model !== '';
  const analysis = useApi(() => api.vehicle(brand, model), [brand, model], shown);
  const mileage = useApi(() => api.mileage(brand, model), [brand, model], shown);

  return (
    <>
      {/* keyed by the shown vehicle: the form starts again from the URL when it changes */}
      <Picker key={`${brand}|${model}`} brand={brand} model={model} onShow={(b, m) => setParams({ brand: b, model: m })} />

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

      {shown && analysis.status === 'ready' && (() => {
        const { summary, history } = analysis.data;
        const change = summary.five_year_change;
        const min = summary.min_year_listings;
        const reliable = history.filter((h) => h.count >= min);
        const thin = history.filter((h) => h.count < min).map((h) => h.year);
        const compared = change ? [change.from_year, change.to_year] : [];

        const readouts: Readout[] = [
          { label: t.vehicle.avgPrice, value: f.money(summary.avg_price), note: t.vehicle.avgPriceNote },
          { label: t.vehicle.listings, value: f.number(summary.total_samples), note: fill(t.vehicle.listingsNote, { years: history.length }) },
          change
            ? { label: t.vehicle.fiveYears, value: f.signedPercent(change.pct), note: fill(t.vehicle.fiveYearsNote, { from: change.from_year, to: change.to_year }), evidence: true }
            : { label: t.vehicle.fiveYears, value: '—', note: t.vehicle.fiveYearsNone },
        ];

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
              <KpiBand label={vehicleName(brand, model)} items={readouts} />
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

              <Panel
                className="narrow"
                title={t.vehicle.mileageTitle}
                help={t.vehicle.mileageHelp}
                table={
                  mileage.status === 'ready'
                    ? {
                        caption: t.vehicle.mileageTitle,
                        columns: [t.vehicle.odometer, t.vehicle.price],
                        numeric: [0, 1],
                        rows: mileage.data.map((p) => [f.number(p.odometer), f.money(p.price)]),
                      }
                    : undefined
                }
              >
                {mileage.status === 'ready' ? (
                  mileage.data.length > 0 ? (
                    <Suspense fallback={<Loading height={280} />}>
                      <ScatterPlot
                        points={mileage.data}
                        xName={t.vehicle.odometer}
                        yName={t.vehicle.price}
                        formatX={(v) => `${f.number(Math.round(v / 1000))}k`}
                        formatY={f.compactMoney}
                        height={280}
                      />
                    </Suspense>
                  ) : (
                    <p className="panel-help">{t.vehicle.noMileage}</p>
                  )
                ) : mileage.status === 'error' ? (
                  <ErrorState error={mileage.error} onRetry={mileage.retry} height={280} />
                ) : (
                  <Loading height={280} />
                )}
              </Panel>
            </div>
          </>
        );
      })()}
    </>
  );
}

/** Brand and model choice. It keeps its own draft until "Show analysis"; the URL holds the shown vehicle. */
function Picker({ brand, model, onShow }: { brand: string; model: string; onShow: (brand: string, model: string) => void }) {
  const { t } = useI18n();
  const [draftBrand, setDraftBrand] = useState(brand);
  const [draftModel, setDraftModel] = useState(model);
  const brands = useApi(api.brands, []);
  const models = useApi(() => api.models(draftBrand), [draftBrand], draftBrand !== '');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draftBrand && draftModel) onShow(draftBrand, draftModel);
  }

  return (
    <form className="panel picker" onSubmit={submit} aria-label={t.vehicle.pickTitle}>
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
          {brands.status === 'ready' && brands.data.map((b) => <option key={b} value={b}>{brandName(b)}</option>)}
        </select>
      </label>
      <label className="field">
        {t.vehicle.model}
        <select value={draftModel} onChange={(e) => setDraftModel(e.target.value)} disabled={!draftBrand || models.status !== 'ready'}>
          <option value="">{draftBrand && models.status === 'loading' ? t.vehicle.loadingOptions : t.vehicle.chooseModel}</option>
          {draftBrand && models.status === 'ready' && models.data.map((m) => <option key={m} value={m}>{modelName(m)}</option>)}
        </select>
      </label>
      <button type="submit" className="btn btn-primary" disabled={!draftBrand || !draftModel}>
        {t.vehicle.show}
      </button>
      <p className="picker-note">{t.vehicle.modelsNote}</p>
    </form>
  );
}
