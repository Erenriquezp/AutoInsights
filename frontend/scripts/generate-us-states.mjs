// Builds src/charts/usStates.ts: one SVG path per state, so the dashboard draws a real map
// with no map service and no geodata request at run time.
//
// Source: the US Census cartographic boundaries distributed as the us-atlas package (public
// domain data), already projected with Albers USA to a 975 x 610 box (Alaska and Hawaii are
// moved under the Southwest). This script simplifies them for dashboard size and writes the
// paths, a label position and an area for every state.
//
// Run it with `npm run generate:map` after changing the simplification or the label nudges.
// The output is committed, so the app and its build never need this script or its packages.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';

const OUT = fileURLToPath(new URL('../src/charts/usStates.ts', import.meta.url));
/** Minimum triangle area kept when simplifying: higher is coarser and smaller. */
const WEIGHT = 1.2;
const topo = JSON.parse(readFileSync(new URL('../node_modules/us-atlas/states-albers-10m.json', import.meta.url), 'utf8'));
const simple = simplify(presimplify(topo), WEIGHT);
const states = feature(simple, simple.objects.states).features;

const CODES = {
  Alabama: 'al', Alaska: 'ak', Arizona: 'az', Arkansas: 'ar', California: 'ca', Colorado: 'co', Connecticut: 'ct', Delaware: 'de',
  'District of Columbia': 'dc', Florida: 'fl', Georgia: 'ga', Hawaii: 'hi', Idaho: 'id', Illinois: 'il', Indiana: 'in', Iowa: 'ia',
  Kansas: 'ks', Kentucky: 'ky', Louisiana: 'la', Maine: 'me', Maryland: 'md', Massachusetts: 'ma', Michigan: 'mi', Minnesota: 'mn',
  Mississippi: 'ms', Missouri: 'mo', Montana: 'mt', Nebraska: 'ne', Nevada: 'nv', 'New Hampshire': 'nh', 'New Jersey': 'nj',
  'New Mexico': 'nm', 'New York': 'ny', 'North Carolina': 'nc', 'North Dakota': 'nd', Ohio: 'oh', Oklahoma: 'ok', Oregon: 'or',
  Pennsylvania: 'pa', 'Rhode Island': 'ri', 'South Carolina': 'sc', 'South Dakota': 'sd', Tennessee: 'tn', Texas: 'tx', Utah: 'ut',
  Vermont: 'vt', Virginia: 'va', Washington: 'wa', 'West Virginia': 'wv', Wisconsin: 'wi', Wyoming: 'wy',
};

const r = (n) => Math.round(n * 10) / 10;
const ringArea = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a / 2;
};
const ringCentroid = (ring) => {
  let x = 0, y = 0, a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    x += (ring[j][0] + ring[i][0]) * f;
    y += (ring[j][1] + ring[i][1]) * f;
    a += f;
  }
  return [x / (3 * a), y / (3 * a)];
};

const rows = [];
for (const s of states) {
  const code = CODES[s.properties.name];
  if (!code) continue;
  const polygons = s.geometry.type === 'Polygon' ? [s.geometry.coordinates] : s.geometry.coordinates;
  // drop islets too small to see at dashboard size (they only add bytes)
  const kept = polygons.filter((p) => Math.abs(ringArea(p[0])) >= 6);
  const use = kept.length ? kept : [polygons.reduce((a, b) => (Math.abs(ringArea(a[0])) > Math.abs(ringArea(b[0])) ? a : b))];
  let d = '';
  let area = 0;
  let main = use[0];
  for (const polygon of use) {
    const a = Math.abs(ringArea(polygon[0]));
    area += a;
    if (a > Math.abs(ringArea(main[0]))) main = polygon;
    for (const ring of polygon) {
      let px = 0, py = 0;
      ring.slice(0, -1).forEach(([x, y], i) => {
        const [qx, qy] = [r(x), r(y)];
        // relative moves keep the numbers short
        d += i === 0 ? `M${qx},${qy}` : `l${r(qx - px)},${r(qy - py)}`;
        [px, py] = [qx, qy];
      });
      d += 'z';
    }
  }
  const [cx, cy] = ringCentroid(main[0]);
  rows.push({ code, name: s.properties.name, d, x: Math.round(cx), y: Math.round(cy), area: Math.round(area) });
}
rows.sort((a, b) => a.name.localeCompare(b.name));
if (rows.length !== 51) throw new Error(`expected 51 states, got ${rows.length}`);

// label positions adjusted by hand where the centroid falls badly (panhandles, lakes, bays)
const NUDGE = { fl: [22, 8], la: [-10, -4], mi: [14, 22], id: [-2, 18], ca: [-8, 4], ky: [8, 2], va: [10, 4], md: [0, -4], ny: [8, 0], ok: [16, 4], tx: [8, 0], mn: [-8, 0], wv: [-4, 6], nj: [1, 4], ma: [-2, -1], hi: [10, 8], ak: [0, -4], ms: [0, 4] };
for (const row of rows) {
  const n = NUDGE[row.code];
  if (n) { row.x += n[0]; row.y += n[1]; }
}

const body = rows
  .map((s) => `  { code: '${s.code}', name: ${JSON.stringify(s.name).replace(/"/g, "'")}, x: ${s.x}, y: ${s.y}, area: ${s.area}, d: '${s.d}' },`)
  .join('\n');

writeFileSync(
  OUT,
  `// The 50 states and DC as SVG paths: a real map with no map service and no geodata request.
// Generated from the US Census cartographic boundaries distributed as us-atlas (public domain data),
// already projected with Albers USA (Alaska and Hawaii moved under the Southwest) to a
// 975 x 610 box and simplified for dashboard size. Do not edit by hand: change
// scripts/generate-us-states.mjs and run "npm run generate:map".

export interface StateShape {
  code: string;
  name: string;
  /** where the two-letter label goes */
  x: number;
  y: number;
  /** area in square units of the map box: decides whether a label fits inside */
  area: number;
  d: string;
}

export const MAP_WIDTH = 975;
export const MAP_HEIGHT = 610;

export const STATES: StateShape[] = [
${body}
];

export const STATE_NAMES: Record<string, string> = Object.fromEntries(STATES.map((s) => [s.code, s.name]));
`,
);
console.log('states', rows.length, 'bytes', body.length, 'smallest', rows.slice().sort((a, b) => a.area - b.area).slice(0, 8).map((s) => `${s.code}:${s.area}`).join(' '));
