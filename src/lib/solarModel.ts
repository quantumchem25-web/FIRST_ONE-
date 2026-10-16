// Solar Explorer model: self-contained single-diode cell, sun position,
// clear-sky irradiance, daily energy yield and partial-shading module model.

export const Q = 1.602e-19;
export const K = 1.381e-23;

export interface CellSpec {
  isc0: number; // A at 1000 W/m2, 25C
  voc0: number; // V at 1000 W/m2, 25C
  ideality: number;
  tempCoeffIsc: number; // fraction per C
  tempCoeffVoc: number; // V per C
  area: number; // cm2
}

export const DEFAULT_CELL: CellSpec = {
  isc0: 9.2,
  voc0: 0.64,
  ideality: 1.3,
  tempCoeffIsc: 0.0005,
  tempCoeffVoc: -0.0023,
  area: 243,
};

export interface CellState {
  iph: number;
  i0: number;
  vt: number;
  voc: number;
}

export interface IVPoint {
  V: number;
  I: number;
  P: number;
}

export interface CellMetrics {
  curve: IVPoint[];
  isc: number;
  voc: number;
  pmax: number;
  vmp: number;
  imp: number;
  fillFactor: number;
  efficiency: number; // percent
}

export const thermalVoltage = (tC: number) => (K * (tC + 273.15)) / Q;

export function cellState(spec: CellSpec, G: number, tC: number): CellState {
  const g = Math.max(G, 0.5);
  const iph = spec.isc0 * (g / 1000) * (1 + spec.tempCoeffIsc * (tC - 25));
  const vt = spec.ideality * thermalVoltage(tC);
  const voc = Math.max(
    0.05,
    spec.voc0 + spec.tempCoeffVoc * (tC - 25) + vt * Math.log(g / 1000),
  );
  const i0 = iph / (Math.exp(voc / vt) - 1);
  return { iph, i0, vt, voc };
}

export const cellCurrent = (c: CellState, V: number) =>
  c.iph - c.i0 * (Math.exp(V / c.vt) - 1);

export function cellVoltage(c: CellState, I: number) {
  if (I >= c.iph) return 0;
  return c.vt * Math.log((c.iph - I) / c.i0 + 1);
}

export function sweepCell(
  spec: CellSpec,
  G: number,
  tC: number,
  points = 120,
): CellMetrics {
  const c = cellState(spec, G, tC);
  const curve: IVPoint[] = [];
  let best: IVPoint = { V: 0, I: 0, P: 0 };
  for (let k = 0; k <= points; k++) {
    const V = (c.voc * k) / points;
    const I = Math.max(0, cellCurrent(c, V));
    const P = V * I;
    const pt = { V, I, P };
    curve.push(pt);
    if (P > best.P) best = pt;
  }
  const areaM2 = spec.area / 1e4;
  const pin = Math.max(G, 0.5) * areaM2;
  return {
    curve,
    isc: c.iph,
    voc: c.voc,
    pmax: best.P,
    vmp: best.V,
    imp: best.I,
    fillFactor: best.P / Math.max(c.iph * c.voc, 1e-9),
    efficiency: (best.P / pin) * 100,
  };
}

/* ------------------------------ Sun & weather ----------------------------- */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface SunPosition {
  elevation: number; // deg
  azimuth: number; // deg from north, clockwise
}

export function sunPosition(lat: number, dayOfYear: number, hour: number): SunPosition {
  const dec = 23.45 * Math.sin(rad((360 / 365) * (284 + dayOfYear)));
  const ha = 15 * (hour - 12);
  const sinEl =
    Math.sin(rad(lat)) * Math.sin(rad(dec)) +
    Math.cos(rad(lat)) * Math.cos(rad(dec)) * Math.cos(rad(ha));
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const cosAz =
    (Math.sin(rad(dec)) - Math.sin(el) * Math.sin(rad(lat))) /
    Math.max(Math.cos(el) * Math.cos(rad(lat)), 1e-9);
  let az = deg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (ha > 0) az = 360 - az;
  return { elevation: deg(el), azimuth: az };
}

export interface SiteConfig {
  latitude: number;
  dayOfYear: number;
  tilt: number; // deg from horizontal
  panelAzimuth: number; // 180 = south
  cloud: number; // 0..1
  ambient: number; // C
}

export function planeIrradiance(site: SiteConfig, hour: number) {
  const sun = sunPosition(site.latitude, site.dayOfYear, hour);
  if (sun.elevation <= 0) return { G: 0, sun, direct: 0, diffuse: 0 };
  const sinEl = Math.sin(rad(sun.elevation));
  const airMass = 1 / (sinEl + 0.50572 * Math.pow(96.07995 - sun.elevation, -1.6364));
  const dni = 1353 * Math.pow(0.7, Math.pow(airMass, 0.678));
  const cosInc = Math.max(
    0,
    sinEl * Math.cos(rad(site.tilt)) +
      Math.cos(rad(sun.elevation)) *
        Math.sin(rad(site.tilt)) *
        Math.cos(rad(sun.azimuth - site.panelAzimuth)),
  );
  const direct = dni * cosInc * (1 - 0.75 * site.cloud);
  const diffuse = 0.1 * dni * sinEl * ((1 + Math.cos(rad(site.tilt))) / 2) * (1 + 1.5 * site.cloud);
  return { G: Math.max(0, direct + diffuse), sun, direct, diffuse };
}

export const cellTemperature = (ambient: number, G: number, noct = 45) =>
  ambient + ((noct - 20) / 800) * G;

export interface DayPoint {
  hour: number;
  irradiance: number;
  elevation: number;
  cellTemp: number;
  power: number; // W
  efficiency: number;
  energy: number; // cumulative kWh
}

export interface DayResult {
  points: DayPoint[];
  totalKWh: number;
  peakPower: number;
  peakHour: number;
  sunHours: number;
}

export function simulateDay(
  site: SiteConfig,
  cells = 60,
  spec: CellSpec = DEFAULT_CELL,
  step = 0.5,
): DayResult {
  const points: DayPoint[] = [];
  let energy = 0;
  let peakPower = 0;
  let peakHour = 12;
  let sunHours = 0;
  for (let h = 0; h <= 24 + 1e-9; h += step) {
    const { G, sun } = planeIrradiance(site, h);
    let power = 0;
    let eff = 0;
    const tc = cellTemperature(site.ambient, G);
    if (G > 5) {
      const m = sweepCell(spec, G, tc, 60);
      power = m.pmax * cells;
      eff = m.efficiency;
      sunHours += (G / 1000) * step;
    }
    energy += (power * step) / 1000;
    if (power > peakPower) {
      peakPower = power;
      peakHour = h;
    }
    points.push({
      hour: h,
      irradiance: G,
      elevation: Math.max(0, sun.elevation),
      cellTemp: tc,
      power,
      efficiency: eff,
      energy,
    });
  }
  return { points, totalKWh: energy, peakPower, peakHour, sunHours };
}

export function bestTilt(site: SiteConfig, cells = 60) {
  let best = { tilt: 0, kwh: 0 };
  for (let t = 0; t <= 90; t += 5) {
    const r = simulateDay({ ...site, tilt: t }, cells, DEFAULT_CELL, 1);
    if (r.totalKWh > best.kwh) best = { tilt: t, kwh: r.totalKWh };
  }
  return best;
}

export function dayOfYearFromMonth(month: number, day = 15) {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let n = day;
  for (let i = 0; i < month; i++) n += days[i];
  return n;
}

/* ------------------------------ Shading model ----------------------------- */

export interface ModuleConfig {
  cellsPerSubstring: number;
  substrings: number;
  bypass: boolean;
}

export interface ShadeResult {
  curve: IVPoint[];
  pmax: number;
  vmp: number;
  imp: number;
  peaks: number;
}

export function moduleCurve(
  cfg: ModuleConfig,
  shade: number[], // fraction of light blocked per substring
  G: number,
  tC: number,
  spec: CellSpec = DEFAULT_CELL,
  steps = 400,
): ShadeResult {
  const states = Array.from({ length: cfg.substrings }, (_, i) =>
    cellState(spec, G * (1 - Math.min(0.98, shade[i] ?? 0)), tC),
  );
  const maxI = Math.max(...states.map((s) => s.iph));
  const curve: IVPoint[] = [];
  for (let k = 0; k <= steps; k++) {
    const I = maxI * (1 - k / steps) * 1.001;
    let V = 0;
    for (const s of states) {
      if (I < s.iph) V += cfg.cellsPerSubstring * cellVoltage(s, I);
      else if (cfg.bypass) V -= 0.6;
      else V -= cfg.cellsPerSubstring * (I - s.iph) * 0.6 + 0.3;
    }
    if (V >= 0) curve.push({ V, I, P: V * I });
  }
  curve.sort((a, b) => a.V - b.V);
  let best: IVPoint = { V: 0, I: 0, P: 0 };
  for (const p of curve) if (p.P > best.P) best = p;
  // count local maxima of power with a small smoothing window
  let peaks = 0;
  const w = 6;
  for (let i = w; i < curve.length - w; i++) {
    const p = curve[i].P;
    let isPeak = p > best.P * 0.15;
    for (let j = 1; j <= w && isPeak; j++) {
      if (curve[i - j].P > p || curve[i + j].P >= p) isPeak = false;
    }
    if (isPeak) peaks++;
  }
  return { curve, pmax: best.P, vmp: best.V, imp: best.I, peaks: Math.max(peaks, 1) };
}

/* ---------------------------- Temperature study --------------------------- */

export interface TempPoint {
  temp: number;
  voc: number;
  isc: number;
  pmax: number;
  efficiency: number;
  fillFactor: number;
}

export function temperatureSweep(
  G: number,
  from = 0,
  to = 85,
  step = 5,
  spec: CellSpec = DEFAULT_CELL,
): TempPoint[] {
  const out: TempPoint[] = [];
  for (let t = from; t <= to; t += step) {
    const m = sweepCell(spec, G, t, 100);
    out.push({
      temp: t,
      voc: m.voc,
      isc: m.isc,
      pmax: m.pmax,
      efficiency: m.efficiency,
      fillFactor: m.fillFactor,
    });
  }
  return out;
}

export const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toFixed(d) : "—";
