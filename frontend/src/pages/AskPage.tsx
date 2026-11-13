import { lazy, Suspense, useState, type FormEvent } from 'react';
import { STATE_NAMES } from '../charts/usStates';
import { BarList, Button, Card, DataTable, KpiStrip, Loading } from '../components/ui';
import { useI18n } from '../i18n/context';
import type { Messages } from '../i18n/en';
import { api, ApiError } from '../lib/api';
import { brandName, modelName, type Formatters } from '../lib/format';
import type { AskAnswer } from '../lib/types';
import { useApi } from '../lib/useApi';
import './pages.css';

const TrendChart = lazy(() => import('../charts/TrendChart'));

type Status = { kind: 'idle' } | { kind: 'asking' } | { kind: 'answer'; answer: AskAnswer } | { kind: 'error'; message: string };
type Cell = string | number | null;

function errorMessage(error: unknown, t: Messages): string {
  if (!(error instanceof ApiError)) return t.ask.errors.generic;
  if (error.code.startsWith('rejected_')) return t.ask.errors.rejected;
  const known = t.ask.errors as Record<string, string>;
  return known[error.code] ?? (error.status === 422 ? t.ask.tooShort : t.ask.errors.generic);
}

const isYear = (column: string) => /(^|_)year$/.test(column);

/** A column's name as people say it: the known ones are translated, the rest lose their underscores. */
function columnTitle(column: string, t: Messages): string {
  const known = t.ask.columns[column];
  if (known) return known;
  const words = column.replace(/_/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : column;
}

/**
 * How to show a cell, decided by its column: the query returns raw values ("ford", 7990, "ca"),
 * the same ones the rest of the dashboard formats.
 */
function cellFormatter(column: string, t: Messages, f: Formatters): (value: Cell) => string {
  const text = (format: (v: string) => string) => (value: Cell) => (value === null ? '—' : format(String(value)));
  if (column === 'manufacturer') return text(brandName);
  if (column === 'model') return text(modelName);
  if (column === 'state') return text((v) => STATE_NAMES[v] ?? v.toUpperCase());
  if (column === 'condition') return text((v) => t.conditions[v] ?? v);
  // a year is a name, not a quantity: no thousands separator
  if (isYear(column)) return text((v) => v);
  if (/price/.test(column)) return (value) => (typeof value === 'number' ? f.money(Math.round(value)) : (value ?? '—'));
  return (value) => (typeof value === 'number' ? f.number(Number.isInteger(value) ? value : Math.round(value * 100) / 100) : (value ?? '—'));
}

export default function AskPage() {
  const { t } = useI18n();
  const examples = useApi(api.askExamples, []);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  // `shown` is what the box displays; `text` is what is sent (an example goes out in its
  // original English, which the offline model also understands)
  async function ask(text: string, shown = text) {
    const q = text.trim();
    if (q.length < 3) {
      setStatus({ kind: 'error', message: t.ask.tooShort });
      return;
    }
    setQuestion(shown.trim());
    setAsked(q);
    setCopied(false);
    setStatus({ kind: 'asking' });
    try {
      setStatus({ kind: 'answer', answer: await api.ask(q) });
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error, t) });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  async function copy(sql: string) {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const failed = status.kind === 'error';

  return (
    <>
      <Card className="ask-box">
        <form onSubmit={submit} className="ask-form">
          <label className="field ask-field">
            {t.ask.label}
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.ask.placeholder}
              maxLength={300}
              autoComplete="off"
              aria-invalid={failed}
              aria-describedby={failed ? 'ask-error' : 'ask-notice'}
            />
          </label>
          <Button type="submit" variant="primary" disabled={status.kind === 'asking'}>
            {status.kind === 'asking' ? t.ask.asking : t.ask.submit}
          </Button>
        </form>
        {/* what went wrong sits right under the box it is about */}
        {failed && (
          <p id="ask-error" className="field-error" role="alert">
            {status.message}
          </p>
        )}
        <p id="ask-notice" className="ask-notice">
          {t.ask.notice}
        </p>
        {examples.status === 'ready' && examples.data.length > 0 && (
          <div className="ask-examples">
            <p>{t.ask.examples}</p>
            <ul>
              {examples.data.map((example) => {
                const label = t.ask.exampleLabels[example] ?? example;
                return (
                  <li key={example}>
                    <button type="button" className="chip" aria-pressed={asked === example} onClick={() => void ask(example, label)}>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>

      <div aria-live="polite" className="ask-result">
        {status.kind === 'asking' && <Loading height={280} />}
        {status.kind === 'answer' && <Answer answer={status.answer} asked={question} copied={copied} onCopy={copy} />}
      </div>
    </>
  );
}

function Answer({ answer, asked, copied, onCopy }: { answer: AskAnswer; asked: string; copied: boolean; onCopy: (sql: string) => void }) {
  const { t, f, fill } = useI18n();
  const { columns, rows, chart } = answer;
  const titles = columns.map((c) => columnTitle(c, t));
  const formats = columns.map((c) => cellFormatter(c, t, f));
  const table = {
    caption: t.ask.answer,
    columns: titles,
    rows: rows.map((r) => r.map((cell, i) => formats[i](cell))),
    numeric: columns.map((_, i) => i).filter((i) => typeof rows[0]?.[i] === 'number' && !isYear(columns[i])),
  };
  const xi = Math.max(0, chart.x ? columns.indexOf(chart.x) : 0);
  const yi = Math.max(0, chart.y ? columns.indexOf(chart.y) : 1);
  const money = /price/.test(columns[yi] ?? '');

  let body;
  if (rows.length === 0) body = <p className="card-help">{t.ask.emptyAnswer}</p>;
  else if (chart.type === 'number') body = <KpiStrip nested label={t.ask.answer} items={[{ label: titles[0], value: formats[0](rows[0][0]) }]} />;
  else if (chart.type === 'bar')
    body = (
      <BarList
        label={t.ask.answer}
        items={rows.map((r, i) => ({ label: formats[xi](r[xi]), value: Number(r[yi]), display: formats[yi](r[yi]), highlight: i === 0 }))}
      />
    );
  else if (chart.type === 'line')
    body = (
      <Suspense fallback={<Loading height={280} />}>
        <TrendChart
          label={`${t.ask.answer}. ${asked}`}
          data={rows.map((r) => ({ key: String(r[xi]), label: formats[xi](r[xi]), value: Number(r[yi]), title: `${titles[xi]} ${formats[xi](r[xi])}` }))}
          formatValue={(v) => formats[yi](v)}
          formatAxis={money ? f.compactMoney : f.number}
          valueName={titles[yi] ?? ''}
          height={280}
        />
      </Suspense>
    );
  else body = <DataTable {...table} />;

  return (
    <div className="grid">
      <Card
        className="wide"
        title={t.ask.answer}
        help={asked}
        footnote={rows.length === 1 ? t.ask.rowsOne : fill(t.ask.rows, { count: f.number(rows.length) })}
        table={chart.type !== 'table' && chart.type !== 'number' && rows.length > 0 ? table : undefined}
      >
        {body}
      </Card>
      <Card className="narrow ask-how" title={t.ask.sqlTitle} help={t.ask.sqlHelp}>
        <pre className="sql-block">
          <code>{answer.sql}</code>
        </pre>
        <Button className="copy-button" icon="copy" onClick={() => onCopy(answer.sql)}>
          {copied ? t.ask.copied : t.ask.copy}
        </Button>
        <ul className="ask-guard">
          <li>{t.ask.guardReadOnly}</li>
          <li>{t.ask.guardLimits}</li>
          <li>
            {fill(t.ask.provider, {
              provider: answer.provider === 'fake' ? t.ask.providerFake : `${t.ask.providerNames[answer.provider] ?? answer.provider} (${answer.model})`,
            })}
          </li>
        </ul>
      </Card>
    </div>
  );
}
