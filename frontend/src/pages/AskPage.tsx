import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { BarList, DataTable, KpiBand, Loading, Panel } from '../components/ui';
import { useI18n } from '../i18n/context';
import type { Messages } from '../i18n/en';
import { api, ApiError } from '../lib/api';
import type { AskAnswer } from '../lib/types';
import { useApi } from '../lib/useApi';
import './pages.css';

const ColumnChart = lazy(() => import('../charts/ColumnChart'));

type Status = { kind: 'idle' } | { kind: 'asking' } | { kind: 'answer'; answer: AskAnswer } | { kind: 'error'; message: string };

function errorMessage(error: unknown, t: Messages): string {
  if (!(error instanceof ApiError)) return t.ask.errors.generic;
  if (error.code.startsWith('rejected_')) return t.ask.errors.rejected;
  const known = t.ask.errors as Record<string, string>;
  return known[error.code] ?? (error.status === 422 ? t.ask.tooShort : t.ask.errors.generic);
}

export default function AskPage() {
  const { t, f } = useI18n();
  const examples = useApi(api.askExamples, []);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3) {
      setStatus({ kind: 'error', message: t.ask.tooShort });
      return;
    }
    setQuestion(q);
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

  const fmt = (value: string | number | null) =>
    typeof value === 'number' ? (Number.isInteger(value) ? f.number(value) : f.number(Math.round(value * 100) / 100)) : (value ?? '—');

  return (
    <>
      <section className="panel ask-box">
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
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={status.kind === 'asking'}>
            {status.kind === 'asking' ? t.ask.asking : t.ask.submit}
          </button>
        </form>
        <p className="ask-notice">{t.ask.notice}</p>
        {examples.status === 'ready' && examples.data.length > 0 && (
          <div className="ask-examples">
            <p>{t.ask.examples}</p>
            <ul>
              {examples.data.map((example) => (
                <li key={example}>
                  <button type="button" className="chip" aria-pressed={question === example} onClick={() => void ask(example)}>
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div aria-live="polite">
        {status.kind === 'asking' && <Loading height={240} />}
        {status.kind === 'error' && (
          <div className="panel ask-error" role="alert">
            <p>{status.message}</p>
          </div>
        )}
        {status.kind === 'answer' && <Answer answer={status.answer} fmt={fmt} copied={copied} onCopy={copy} />}
      </div>
    </>
  );
}

function Answer({ answer, fmt, copied, onCopy }: { answer: AskAnswer; fmt: (v: string | number | null) => string; copied: boolean; onCopy: (sql: string) => void }) {
  const { t, f, fill } = useI18n();
  const { columns, rows, chart } = answer;
  const table = { caption: t.ask.answer, columns, rows: rows.map((r) => r.map(fmt)), numeric: columns.map((_, i) => i).filter((i) => typeof rows[0]?.[i] === 'number') };
  const xi = chart.x ? columns.indexOf(chart.x) : 0;
  const yi = chart.y ? columns.indexOf(chart.y) : 1;

  let body;
  if (rows.length === 0) body = <p className="panel-help">{t.ask.emptyAnswer}</p>;
  else if (chart.type === 'number') body = <KpiBand label={t.ask.answer} items={[{ label: columns[0], value: fmt(rows[0][0]), evidence: true }]} />;
  else if (chart.type === 'bar')
    body = (
      <BarList
        label={t.ask.answer}
        items={rows.map((r, i) => ({ label: String(r[xi]), value: Number(r[yi]), display: fmt(r[yi]), highlight: i === 0 }))}
      />
    );
  else if (chart.type === 'line')
    body = (
      <Suspense fallback={<Loading height={260} />}>
        <ColumnChart
          data={rows.map((r) => ({ key: String(r[xi]), label: String(r[xi]), value: Number(r[yi]) }))}
          formatValue={(v) => fmt(v)}
          formatAxis={f.number}
          valueName={columns[yi] ?? ''}
          labelEvery={rows.length > 16 ? 4 : 1}
        />
      </Suspense>
    );
  else body = <DataTable {...table} />;

  return (
    <div className="grid">
      <Panel className="wide" title={t.ask.answer} help={answer.question}
        footnote={fill(t.ask.rows, { count: f.number(rows.length) })} table={chart.type !== 'table' && rows.length > 0 ? table : undefined}>
        {body}
      </Panel>
      <Panel className="narrow" title={t.ask.sqlTitle} help={t.ask.sqlHelp}>
        <pre className="sql-block">
          <code>{answer.sql}</code>
        </pre>
        <button type="button" className="btn copy-button" onClick={() => onCopy(answer.sql)}>
          <Icon name="copy" size={18} />
          {copied ? t.ask.copied : t.ask.copy}
        </button>
        <ul className="ask-guard">
          <li>{t.ask.guardReadOnly}</li>
          <li>{t.ask.guardLimits}</li>
          <li>
            {fill(t.ask.provider, {
              provider: answer.provider === 'fake' ? t.ask.providerFake : `${t.ask.providerNames[answer.provider] ?? answer.provider} (${answer.model})`,
            })}
          </li>
        </ul>
      </Panel>
    </div>
  );
}
