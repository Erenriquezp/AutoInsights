import './StackedShare.css';

export interface SharePart {
  key: string;
  name: string;
  value: number;
  /** the share as text ("31 %") */
  share: string;
  /** the value as text ("109,760") */
  amount: string;
  /** step of the ordered scale (1 = best), or "missing" for the part that is absence of data */
  tone: 1 | 2 | 3 | 4 | 5 | 6 | 'missing';
}

/**
 * Parts of one whole: a single bar split in proportion, then the same parts as a list with
 * their numbers. The part that is missing data is hatched and neutral, and goes last.
 */
export default function StackedShare({ parts, label }: { parts: SharePart[]; label: string }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  const summary = `${label}: ${parts.map((p) => `${p.name} ${p.share}`).join(', ')}`;
  return (
    <div className="share">
      <div className="share-bar" role="img" aria-label={summary}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const fraction = p.value / total;
            return (
              <span key={p.key} className="share-part" data-tone={p.tone} style={{ flexGrow: p.value }} title={`${p.name}: ${p.amount} (${p.share})`}>
                {/* a part too narrow for its share prints none: the list underneath has it */}
                {fraction >= 0.09 && <span>{p.share}</span>}
              </span>
            );
          })}
      </div>
      <ul className="share-list">
        {parts.map((p) => (
          <li key={p.key} className={p.tone === 'missing' ? 'is-missing' : undefined}>
            <span className="share-swatch" data-tone={p.tone} aria-hidden="true" />
            <span className="share-name">{p.name}</span>
            <span className="share-amount">{p.amount}</span>
            <span className="share-value">{p.share}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
