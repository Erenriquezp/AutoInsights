// Tile-grid map of the 50 states and DC: each state is one square, placed roughly where it is
// on the map. Equal-size tiles make small states as readable as large ones, need no geodata or
// third-party map script, and fit the dashboard's drafting grid.

export interface Tile {
  code: string;
  name: string;
  col: number;
  row: number;
}

const LAYOUT: [code: string, name: string, col: number, row: number][] = [
  ['ak', 'Alaska', 0, 0], ['me', 'Maine', 11, 0],
  ['wi', 'Wisconsin', 6, 1], ['vt', 'Vermont', 10, 1], ['nh', 'New Hampshire', 11, 1],
  ['wa', 'Washington', 1, 2], ['id', 'Idaho', 2, 2], ['mt', 'Montana', 3, 2], ['nd', 'North Dakota', 4, 2],
  ['mn', 'Minnesota', 5, 2], ['il', 'Illinois', 6, 2], ['mi', 'Michigan', 7, 2], ['ny', 'New York', 9, 2],
  ['ma', 'Massachusetts', 10, 2],
  ['or', 'Oregon', 1, 3], ['nv', 'Nevada', 2, 3], ['wy', 'Wyoming', 3, 3], ['sd', 'South Dakota', 4, 3],
  ['ia', 'Iowa', 5, 3], ['in', 'Indiana', 6, 3], ['oh', 'Ohio', 7, 3], ['pa', 'Pennsylvania', 8, 3],
  ['nj', 'New Jersey', 9, 3], ['ct', 'Connecticut', 10, 3], ['ri', 'Rhode Island', 11, 3],
  ['ca', 'California', 1, 4], ['ut', 'Utah', 2, 4], ['co', 'Colorado', 3, 4], ['ne', 'Nebraska', 4, 4],
  ['mo', 'Missouri', 5, 4], ['ky', 'Kentucky', 6, 4], ['wv', 'West Virginia', 7, 4], ['va', 'Virginia', 8, 4],
  ['md', 'Maryland', 9, 4], ['de', 'Delaware', 10, 4],
  ['az', 'Arizona', 2, 5], ['nm', 'New Mexico', 3, 5], ['ks', 'Kansas', 4, 5], ['ar', 'Arkansas', 5, 5],
  ['tn', 'Tennessee', 6, 5], ['nc', 'North Carolina', 7, 5], ['sc', 'South Carolina', 8, 5],
  ['dc', 'District of Columbia', 9, 5],
  ['ok', 'Oklahoma', 4, 6], ['la', 'Louisiana', 5, 6], ['ms', 'Mississippi', 6, 6], ['al', 'Alabama', 7, 6],
  ['ga', 'Georgia', 8, 6],
  ['hi', 'Hawaii', 0, 7], ['tx', 'Texas', 4, 7], ['fl', 'Florida', 9, 7],
];

export const TILES: Tile[] = LAYOUT.map(([code, name, col, row]) => ({ code, name, col, row }));
export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;
export const STATE_NAMES: Record<string, string> = Object.fromEntries(TILES.map((t) => [t.code, t.name]));
