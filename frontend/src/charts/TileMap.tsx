import { useMemo } from 'react';
import { classOf, quantileBreaks } from '../lib/stats';
import { GRID_COLUMNS, GRID_ROWS, TILES } from './usStates';
import './TileMap.css';

export interface TileValue {
  /** what the color encodes */
  value: number;
  /** lines of the tile's readout, after the state's name ("40,345 listings") */
  lines: string[];
}

interface TileMapProps {
  values: Record<string, TileValue>;
  selected: string | null;
  onSelect: (code: string) => void;
  /** formats the bounds of the classes in the legend */
  formatValue: (value: number) => string;
  /** what the color means ("Listings"), read before the legend's ranges */
  legendTitle: string;
  label: string;
}

const CLASSES = 5;

export default function TileMap({ values, selected, onSelect, formatValue, legendTitle, label }: TileMapProps) {
  const breaks = useMemo(() => quantileBreaks(Object.values(values).map((v) => v.value), CLASSES), [values]);
  const max = Math.max(0, ...Object.values(values).map((v) => v.value));

  return (
    <div className="tile-map-wrap">
      <div
        className="tile-map"
        role="group"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, auto)` }}
      >
        {TILES.map((tile) => {
          const entry = values[tile.code];
          const level = entry ? classOf(entry.value, breaks) : -1;
          return (
            <button
              key={tile.code}
              type="button"
              className="tile"
              data-level={level}
              // the readout opens toward the middle of the map, so it is never cut at an edge
              data-side={tile.col < 3 ? 'start' : tile.col > GRID_COLUMNS - 4 ? 'end' : 'middle'}
              data-below={tile.row < 2 ? 'true' : undefined}
              aria-pressed={selected === tile.code}
              aria-label={entry ? `${tile.name}: ${entry.lines.join(', ')}` : tile.name}
              style={{ gridColumn: tile.col + 1, gridRow: tile.row + 1 }}
              onClick={() => onSelect(tile.code)}
              disabled={!entry}
            >
              <span className="tile-code">{tile.code.toUpperCase()}</span>
              {entry && (
                <span className="tile-tip" aria-hidden="true">
                  <strong>{tile.name}</strong>
                  {entry.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* each class with its range, so a color can be read back as numbers */}
      <ul className="tile-legend" aria-label={legendTitle}>
        {breaks.map((from, i) => (
          <li key={i}>
            <span className="tile-swatch" data-level={i} aria-hidden="true" />
            {formatValue(from)}–{formatValue(i + 1 < breaks.length ? breaks[i + 1] : max)}
          </li>
        ))}
      </ul>
    </div>
  );
}
