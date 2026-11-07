import { useMemo } from 'react';
import { quantileClasses } from './scale';
import { GRID_COLUMNS, GRID_ROWS, TILES } from './usStates';
import './TileMap.css';

export interface TileValue {
  value: number;
  label: string;
}

interface TileMapProps {
  values: Record<string, TileValue>;
  selected: string | null;
  onSelect: (code: string) => void;
  legend: { few: string; many: string };
  label: string;
}

const CLASSES = 5;

export default function TileMap({ values, selected, onSelect, legend, label }: TileMapProps) {
  const classOf = useMemo(
    () => quantileClasses(Object.values(values).map((v) => v.value), CLASSES),
    [values],
  );

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
          const level = entry ? classOf(entry.value) : -1;
          return (
            <button
              key={tile.code}
              type="button"
              className="tile"
              data-level={level}
              aria-pressed={selected === tile.code}
              aria-label={entry ? `${tile.name}: ${entry.label}` : tile.name}
              title={entry ? `${tile.name}: ${entry.label}` : tile.name}
              style={{ gridColumn: tile.col + 1, gridRow: tile.row + 1 }}
              onClick={() => onSelect(tile.code)}
              disabled={!entry}
            >
              <span className="mono">{tile.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
      <div className="tile-legend" aria-hidden="true">
        <span>{legend.few}</span>
        {Array.from({ length: CLASSES }, (_, i) => (
          <span key={i} className="tile-swatch" data-level={i} />
        ))}
        <span>{legend.many}</span>
      </div>
    </div>
  );
}
