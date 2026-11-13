import { useMemo, useState, type KeyboardEvent } from 'react';
import { classOf, quantileBreaks } from '../lib/stats';
import { MAP_HEIGHT, MAP_WIDTH, STATES, type StateShape } from './usStates';
import './StateMap.css';

export interface StateValue {
  /** what the color encodes */
  value: number;
  /** lines of the state's readout, after its name ("40,345 listings") */
  lines: string[];
}

interface StateMapProps {
  values: Record<string, StateValue>;
  selected: string | null;
  onSelect: (code: string) => void;
  /** formats the bounds of the classes in the legend */
  formatValue: (value: number) => string;
  /** what the color means ("Listings per state, by color"), read before the legend's ranges */
  legendTitle: string;
  label: string;
}

const CLASSES = 5;

/** States large enough to carry their two-letter code inside. */
const LABEL_MIN_AREA = 2400;

/**
 * The small states of the Northeast are a few pixels wide: each also gets a labeled box in the
 * Atlantic, north to south, as printed maps do. The box and the shape are one control.
 */
const CALLOUTS = ['vt', 'nh', 'ma', 'ri', 'ct', 'nj', 'de', 'md', 'dc'];
const CALLOUT = { x: 912, y: 214, width: 46, height: 22, step: 27 };

const shapeOf = Object.fromEntries(STATES.map((s) => [s.code, s]));

export default function StateMap({ values, selected, onSelect, formatValue, legendTitle, label }: StateMapProps) {
  const breaks = useMemo(() => quantileBreaks(Object.values(values).map((v) => v.value), CLASSES), [values]);
  const max = Math.max(0, ...Object.values(values).map((v) => v.value));
  // the state under the pointer or holding keyboard focus: it shows its readout
  const [active, setActive] = useState<string | null>(null);
  const activeShape = active ? shapeOf[active] : undefined;
  const activeValue = active ? values[active] : undefined;

  function onKey(event: KeyboardEvent, code: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(code);
    }
  }

  function renderState(state: StateShape) {
    const entry = values[state.code];
    const level = entry ? classOf(entry.value, breaks) : -1;
    const callout = CALLOUTS.indexOf(state.code);
    const code = state.code.toUpperCase();
    return (
      <g
        key={state.code}
        className="state"
        data-level={level}
        role="button"
        tabIndex={entry ? 0 : undefined}
        aria-disabled={!entry}
        aria-pressed={selected === state.code}
        aria-label={entry ? `${state.name}: ${entry.lines.join(', ')}` : state.name}
        onClick={entry ? () => onSelect(state.code) : undefined}
        onKeyDown={entry ? (event) => onKey(event, state.code) : undefined}
        onMouseEnter={() => setActive(state.code)}
        onMouseLeave={() => setActive((current) => (current === state.code ? null : current))}
        onFocus={() => setActive(state.code)}
        onBlur={() => setActive((current) => (current === state.code ? null : current))}
      >
        <path d={state.d} />
        {state.area >= LABEL_MIN_AREA && (
          <text className="state-label" x={state.x} y={state.y}>
            {code}
          </text>
        )}
        {callout >= 0 && (
          <>
            <rect className="state-callout" x={CALLOUT.x} y={CALLOUT.y + callout * CALLOUT.step} width={CALLOUT.width} height={CALLOUT.height} rx={5} />
            <text className="state-label" x={CALLOUT.x + CALLOUT.width / 2} y={CALLOUT.y + callout * CALLOUT.step + CALLOUT.height / 2}>
              {code}
            </text>
          </>
        )}
      </g>
    );
  }

  /** The outline of a state drawn over everything else, so no neighbor covers it. */
  function ring(code: string | null, kind: string) {
    const state = code ? shapeOf[code] : undefined;
    if (!state) return null;
    const callout = CALLOUTS.indexOf(state.code);
    return (
      <g className={`state-ring ${kind}`} aria-hidden="true">
        <path d={state.d} />
        {callout >= 0 && <rect x={CALLOUT.x} y={CALLOUT.y + callout * CALLOUT.step} width={CALLOUT.width} height={CALLOUT.height} rx={5} />}
      </g>
    );
  }

  return (
    <div className="state-map-wrap">
      <div className="state-map">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label={label}>
          {STATES.map(renderState)}
          {ring(selected, 'is-selected')}
          {ring(active, 'is-active')}
        </svg>
        {activeShape && activeValue && (
          <div
            className="map-tip"
            data-side={activeShape.x < 190 ? 'start' : activeShape.x > 760 ? 'end' : 'middle'}
            data-below={activeShape.y < 120 ? 'true' : undefined}
            style={{ left: `${(activeShape.x / MAP_WIDTH) * 100}%`, top: `${(activeShape.y / MAP_HEIGHT) * 100}%` }}
            aria-hidden="true"
          >
            <strong>{activeShape.name}</strong>
            {activeValue.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        )}
      </div>
      {/* each class with its range, so a color can be read back as numbers */}
      <ul className="map-legend" aria-label={legendTitle}>
        {breaks.map((from, i) => (
          <li key={i}>
            <span className="map-swatch" data-level={i} aria-hidden="true" />
            {formatValue(from)}–{formatValue(i + 1 < breaks.length ? breaks[i + 1] : max)}
          </li>
        ))}
      </ul>
    </div>
  );
}
