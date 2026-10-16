// Photon Studio — advanced solar cell analysis utilities.
// Contains: temperature / irradiance sweeps, partial-shading simulation with bypass
// diodes, MPPT algorithms (Perturb & Observe, Incremental Conductance) and a
// day-long energy yield estimator. Everything is a pure function (no React).

const Q = 1.602e-19;
const K = 1.381e-23;
const EG = 1.12; // eV (silicon band gap)
const ISC_REF = 0.04; // A at 1000 W/m^2
const I0_REF = 1e-9; // A at 25 °C
const IDEALITY = 1.5;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  if (step <= 0) return out;
  for (let x = from; x <= to + step * 1e-9; x += step) out.push(+x.toFixed(10));
  return out;
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}

/** Ordinary least squares line fit y = slope * x + intercept. */
export function linearFit(xs: number[], ys: number[]): LinearFit {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
    syy += ys[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const ssTot = syy - (sy * sy) / n;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const e = ys[i] - (slope * xs[i] + intercept);
    ssRes += e * e;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

/** Tiny deterministic PRNG so the "weather" is stable between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Cell model with optional series resistance (implicit single-diode equation)
// ---------------------------------------------------------------------------

export interface CellModelOptions {
  intensity: number; // W/m^2
  temperature: number; // °C
  series?: number; // cells connected in series
  parallel?: number; // strings in parallel
  Rs?: number; // series resistance per cell (ohm)
}

export interface CellModel {
  Iph: number; // photo-current of one cell
  I0: number;
  Vt: number; // thermal voltage * ideality for one cell
  Rs: number;
  series: number;
  parallel: number;
  Isc: number;
  Voc: number;
  /** current of the whole pack at terminal voltage V (A) */
  current: (V: number) => number;
}

export function thermalVoltage(tempC: number): number {
  const T = 273.15 + tempC;
  return (IDEALITY * K * T) / Q;
}

export function saturationCurrent(tempC: number): number {
  const T = 273.15 + tempC;
  return I0_REF * Math.pow(T / 298.15, 3) * Math.exp(((EG * Q) / K) * (1 / 298.15 - 1 / T));
}

export function makeModel(opts: CellModelOptions): CellModel {
  const series = Math.max(1, Math.floor(opts.series ?? 1));
  const parallel = Math.max(1, Math.floor(opts.parallel ?? 1));
  const Rs = Math.max(0, opts.Rs ?? 0);
  const Vt = thermalVoltage(opts.temperature);
  const I0 = saturationCurrent(opts.temperature);
  const Iph = ISC_REF * (Math.max(0, opts.intensity) / 1000);
  const VocCell = Iph > 0 ? Math.max(0.01, Vt * Math.log(Iph / I0 + 1)) : 0;

  const cellCurrent = (Vc: number): number => {
    if (Iph <= 0) return 0;
    if (Rs <= 1e-9) {
      return Math.max(0, Iph - I0 * (Math.exp(clamp(Vc / Vt, -50, 60)) - 1));
    }
    // Newton iterations on f(I) = Iph - I0 (exp((V + I Rs)/Vt) - 1) - I
    let I = Iph;
    for (let k = 0; k < 40; k++) {
      const e = Math.exp(clamp((Vc + I * Rs) / Vt, -50, 60));
      const f = Iph - I0 * (e - 1) - I;
      const df = -((I0 * e * Rs) / Vt) - 1;
      const step = f / df;
      I -= step;
      if (Math.abs(step) < 1e-12) break;
    }
    return Math.max(0, I);
  };

  const current = (V: number): number => cellCurrent(V / series) * parallel;

  return {
    Iph,
    I0,
    Vt,
    Rs,
    series,
    parallel,
    Isc: current(0),
    Voc: VocCell * series,
    current,
  };
}

export interface OperatingPoint {
  V: number;
  I: number;
  P: number;
}

/** Golden-section search for the maximum power point (P(V) is unimodal). */
export function maxPowerPoint(model: CellModel): OperatingPoint {
  if (model.Voc <= 0) return { V: 0, I: 0, P: 0 };
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = 0;
  let b = model.Voc;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  const P = (v: number) => v * model.current(v);
  let fc = P(c);
  let fd = P(d);
  for (let i = 0; i < 60; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      fc = P(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      fd = P(d);
    }
  }
  const V = (a + b) / 2;
  const I = model.current(V);
  return { V, I, P: V * I };
}

export interface CellMetrics {
  Isc: number;
  Voc: number;
  Pmax: number;
  Vmp: number;
  Imp: number;
  FF: number;
  efficiency: number; // %
  Pin: number; // W
}

export function cellMetrics(opts: CellModelOptions & { area?: number }): CellMetrics {
  const model = makeModel(opts);
  const mp = maxPowerPoint(model);
  const n = model.series * model.parallel;
  const area = (opts.area ?? 4) * n; // cm^2
  const Pin = (opts.intensity * area) / 10000;
  const FF = model.Voc * model.Isc > 0 ? mp.P / (model.Voc * model.Isc) : 0;
  return {
    Isc: model.Isc,
    Voc: model.Voc,
    Pmax: mp.P,
    Vmp: mp.V,
    Imp: mp.I,
    FF,
    efficiency: Pin > 0 ? (mp.P / Pin) * 100 : 0,
    Pin,
  };
}

// ---------------------------------------------------------------------------
// Temperature and irradiance sweeps
// ---------------------------------------------------------------------------

export interface SweepRow extends CellMetrics {
  x: number;
}

export interface SweepSettings {
  from: number;
  to: number;
  step: number;
  fixed: number; // the other variable (intensity for T sweep, temperature for G sweep)
  series: number;
  Rs: number;
  area: number;
}

export function sweepTemperature(s: SweepSettings): SweepRow[] {
  return range(s.from, s.to, s.step).map((T) => ({
    x: T,
    ...cellMetrics({ intensity: s.fixed, temperature: T, series: s.series, Rs: s.Rs, area: s.area }),
  }));
}

export function sweepIrradiance(s: SweepSettings): SweepRow[] {
  return range(s.from, s.to, s.step).map((G) => ({
    x: G,
    ...cellMetrics({ intensity: G, temperature: s.fixed, series: s.series, Rs: s.Rs, area: s.area }),
  }));
}

export interface TempCoefficients {
  vocPerC: number; // mV per °C
  vocPct: number; // % per °C
  pmaxPct: number; // % per °C (relative to value at 25 °C)
  effPerC: number; // absolute efficiency points per °C
  iscPct: number;
  r2Voc: number;
  r2Pmax: number;
}

export function temperatureCoefficients(rows: SweepRow[]): TempCoefficients {
  const xs = rows.map((r) => r.x);
  const voc = linearFit(xs, rows.map((r) => r.Voc));
  const pmax = linearFit(xs, rows.map((r) => r.Pmax));
  const isc = linearFit(xs, rows.map((r) => r.Isc));
  const eff = linearFit(xs, rows.map((r) => r.efficiency));
  const at25 = (fit: LinearFit) => fit.slope * 25 + fit.intercept;
  const safe = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
  return {
    vocPerC: voc.slope * 1000,
    vocPct: safe(voc.slope, at25(voc)),
    pmaxPct: safe(pmax.slope, at25(pmax)),
    effPerC: eff.slope,
    iscPct: safe(isc.slope, at25(isc)),
    r2Voc: voc.r2,
    r2Pmax: pmax.r2,
  };
}

export interface IrradianceLaw {
  iscPerKw: number; // mA per (kW/m^2)
  vocLogSlope: number; // mV per decade
  pmaxExponent: number; // Pmax ∝ G^exponent
  r2: number;
}

export function irradianceLaw(rows: SweepRow[]): IrradianceLaw {
  const valid = rows.filter((r) => r.x > 0 && r.Pmax > 0);
  const isc = linearFit(valid.map((r) => r.x / 1000), valid.map((r) => r.Isc * 1000));
  const voc = linearFit(valid.map((r) => Math.log10(r.x)), valid.map((r) => r.Voc * 1000));
  const power = linearFit(valid.map((r) => Math.log(r.x)), valid.map((r) => Math.log(r.Pmax)));
  return {
    iscPerKw: isc.slope,
    vocLogSlope: voc.slope,
    pmaxExponent: power.slope,
    r2: power.r2,
  };
}

// ---------------------------------------------------------------------------
// Partial shading with bypass diodes
// ---------------------------------------------------------------------------

export interface ShadingConfig {
  cells: number; // cells in series
  shade: number[]; // 0 = full sun, 1 = completely dark, one entry per cell
  groupSize: number; // cells protected by each bypass diode
  bypass: boolean;
  intensity: number;
  temperature: number;
  area: number; // cm^2 per cell
}

export interface ShadingPoint {
  V: number;
  I: number;
  P: number;
}

export interface ShadingResult {
  curve: ShadingPoint[];
  Pmax: number;
  Vmp: number;
  Imp: number;
  Voc: number;
  Isc: number;
  peaks: ShadingPoint[]; // local maxima of the P-V curve
  globalPeak: ShadingPoint;
  idealPmax: number; // same pack with no shade
  lossPct: number; // power lost to shading, %
  hotSpotCells: number[]; // cells forced into reverse bias at the MPP
  groups: number[][];
}

const BYPASS_DROP = 0.5; // V, forward drop of a bypass diode
const REVERSE_SLOPE = 12; // ohm, a shaded cell acts like a resistor when reverse biased

export function buildGroups(cells: number, groupSize: number): number[][] {
  const size = Math.max(1, Math.floor(groupSize));
  const groups: number[][] = [];
  for (let i = 0; i < cells; i += size) {
    const g: number[] = [];
    for (let j = i; j < Math.min(cells, i + size); j++) g.push(j);
    groups.push(g);
  }
  return groups;
}

export function makeShade(cells: number, shaded: number[], level: number): number[] {
  const arr = new Array(cells).fill(0);
  shaded.forEach((i) => {
    if (i >= 0 && i < cells) arr[i] = clamp(level, 0, 1);
  });
  return arr;
}

/** Voltage of one cell when it carries the string current I. */
function cellVoltageAtCurrent(I: number, Iph: number, Vt: number, I0: number): number {
  if (I < Iph) {
    return Vt * Math.log((Iph - I) / I0 + 1);
  }
  // reverse region, linearised: the cell dissipates power
  return -REVERSE_SLOPE * (I - Iph);
}

export function computeShadedString(cfg: ShadingConfig): ShadingResult {
  const n = Math.max(1, cfg.cells);
  const Vt = thermalVoltage(cfg.temperature);
  const I0 = saturationCurrent(cfg.temperature);
  const Iphs: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = clamp(cfg.shade[i] ?? 0, 0, 1);
    Iphs.push(ISC_REF * (cfg.intensity / 1000) * (1 - s));
  }
  const groups = cfg.bypass ? buildGroups(n, cfg.groupSize) : [Array.from({ length: n }, (_, i) => i)];
  const maxIph = Math.max(...Iphs, 1e-9);

  const stringVoltage = (I: number): number => {
    let total = 0;
    for (const g of groups) {
      let v = 0;
      for (const idx of g) v += cellVoltageAtCurrent(I, Iphs[idx], Vt, I0);
      if (cfg.bypass) v = Math.max(v, -BYPASS_DROP);
      total += v;
    }
    return total;
  };

  const curve: ShadingPoint[] = [];
  const steps = 420;
  for (let k = 0; k <= steps; k++) {
    const I = (maxIph * (steps - k)) / steps; // from Isc down to 0 => V rises
    const V = stringVoltage(I);
    if (V < 0) continue;
    curve.push({ V, I, P: V * I });
  }
  curve.sort((a, b) => a.V - b.V);
  // add the short-circuit point (V = 0) found by bisection on the current
  if (curve.length === 0 || curve[0].V > 1e-6) {
    let lo = 0;
    let hi = maxIph * 1.2 + 1e-6;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (stringVoltage(mid) > 0) lo = mid;
      else hi = mid;
    }
    curve.unshift({ V: 0, I: lo, P: 0 });
  }

  let best: ShadingPoint = { V: 0, I: 0, P: 0 };
  curve.forEach((p) => {
    if (p.P > best.P) best = p;
  });

  // local maxima (window comparison to ignore numeric noise)
  const peaks: ShadingPoint[] = [];
  const w = 6;
  for (let i = w; i < curve.length - w; i++) {
    let isPeak = curve[i].P > 0;
    for (let j = 1; j <= w && isPeak; j++) {
      if (curve[i].P < curve[i - j].P || curve[i].P <= curve[i + j].P) isPeak = false;
    }
    if (isPeak) peaks.push(curve[i]);
  }
  if (peaks.length === 0 && best.P > 0) peaks.push(best);

  const ideal = makeModel({ intensity: cfg.intensity, temperature: cfg.temperature, series: n });
  const idealMp = maxPowerPoint(ideal);

  // cells reverse-biased at the global MPP current
  const hot: number[] = [];
  for (let i = 0; i < n; i++) {
    if (best.I > Iphs[i] + 1e-9) hot.push(i);
  }

  const Voc = curve[curve.length - 1]?.V ?? 0;
  const Isc = curve[0]?.I ?? 0;
  return {
    curve,
    Pmax: best.P,
    Vmp: best.V,
    Imp: best.I,
    Voc,
    Isc,
    peaks,
    globalPeak: best,
    idealPmax: idealMp.P,
    lossPct: idealMp.P > 0 ? (1 - best.P / idealMp.P) * 100 : 0,
    hotSpotCells: hot,
    groups,
  };
}

export interface ShadingPreset {
  id: string;
  label: string;
  description: string;
  shaded: number[];
  level: number;
}

export function shadingPresets(cells: number): ShadingPreset[] {
  const half = Math.floor(cells / 2);
  return [
    { id: "clear", label: "Clear sky", description: "All cells fully illuminated", shaded: [], level: 0 },
    {
      id: "leaf",
      label: "Single leaf",
      description: "One cell 80% covered by a leaf",
      shaded: [Math.max(0, cells - 1)],
      level: 0.8,
    },
    {
      id: "pole",
      label: "Pole shadow",
      description: "A thin pole darkens two neighbouring cells by 60%",
      shaded: [0, 1],
      level: 0.6,
    },
    {
      id: "half",
      label: "Half covered",
      description: "Half of the string is in deep shade",
      shaded: Array.from({ length: half }, (_, i) => i),
      level: 0.85,
    },
    {
      id: "dirt",
      label: "Dust patch",
      description: "Every third cell is lightly soiled (30%)",
      shaded: Array.from({ length: cells }, (_, i) => i).filter((i) => i % 3 === 0),
      level: 0.3,
    },
  ];
}

// ---------------------------------------------------------------------------
// MPPT algorithms
// ---------------------------------------------------------------------------

export type MpptAlgorithm = "po" | "inc";

export type IrradianceProfile = "steady" | "step" | "ramp" | "clouds";

export interface MpptSettings {
  algorithm: MpptAlgorithm;
  profile: IrradianceProfile;
  steps: number;
  stepV: number; // perturbation size in volts
  cells: number;
  temperature: number;
  baseIntensity: number;
  startV: number; // starting voltage
  Rs: number;
}

export interface MpptSample {
  t: number;
  V: number;
  I: number;
  P: number;
  Pideal: number;
  G: number;
  Vmp: number;
}

export interface MpptResult {
  samples: MpptSample[];
  trackingEfficiency: number; // %
  energyHarvested: number; // arbitrary unit (sum P)
  energyAvailable: number;
  settleStep: number; // first step within 2% of the ideal power, -1 if never
  oscillationV: number; // average |ΔV| after settling
}

export function intensityAt(profile: IrradianceProfile, t: number, steps: number, base: number): number {
  const x = t / Math.max(1, steps - 1);
  switch (profile) {
    case "steady":
      return base;
    case "step":
      return x < 0.4 ? base * 0.4 : x < 0.75 ? base : base * 0.55;
    case "ramp":
      return base * (0.3 + 0.7 * x);
    case "clouds": {
      const wave = 0.65 + 0.2 * Math.sin(x * Math.PI * 6) + 0.15 * Math.sin(x * Math.PI * 17 + 1);
      return base * clamp(wave, 0.2, 1);
    }
    default:
      return base;
  }
}

export function runMppt(s: MpptSettings): MpptResult {
  const samples: MpptSample[] = [];
  let V = s.startV;
  let prevV = V;
  let prevP = 0;
  let prevI = 0;
  let dir = 1;
  let sumP = 0;
  let sumIdeal = 0;
  let settle = -1;
  const moves: number[] = [];

  for (let t = 0; t < s.steps; t++) {
    const G = intensityAt(s.profile, t, s.steps, s.baseIntensity);
    const model = makeModel({ intensity: G, temperature: s.temperature, series: s.cells, Rs: s.Rs });
    const mp = maxPowerPoint(model);
    V = clamp(V, 0, model.Voc);
    const I = model.current(V);
    const P = V * I;

    samples.push({ t, V, I, P, Pideal: mp.P, G, Vmp: mp.V });
    sumP += P;
    sumIdeal += mp.P;
    if (settle < 0 && mp.P > 0 && P >= 0.98 * mp.P) settle = t;

    let nextV = V;
    if (s.algorithm === "po") {
      const dP = P - prevP;
      const dVv = V - prevV;
      if (t > 0) {
        if (dP > 0) dir = dVv >= 0 ? 1 : -1;
        else dir = dVv >= 0 ? -1 : 1;
      }
      nextV = V + dir * s.stepV;
    } else {
      const dI = I - prevI;
      const dVv = V - prevV;
      if (t === 0 || Math.abs(dVv) < 1e-9) {
        if (Math.abs(dI) > 1e-9) nextV = V + (dI > 0 ? 1 : -1) * s.stepV;
        else nextV = V + s.stepV;
      } else {
        const incC = dI / dVv; // incremental conductance
        const instC = -I / Math.max(V, 1e-6); // -I/V
        const err = incC - instC;
        if (Math.abs(err) < 2e-4) nextV = V; // at the MPP
        else nextV = V + (err > 0 ? 1 : -1) * s.stepV;
      }
    }

    moves.push(Math.abs(nextV - V));
    prevV = V;
    prevP = P;
    prevI = I;
    V = nextV;
  }

  const tail = settle >= 0 ? moves.slice(settle) : moves;
  const osc = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : 0;
  return {
    samples,
    trackingEfficiency: sumIdeal > 0 ? (sumP / sumIdeal) * 100 : 0,
    energyHarvested: sumP,
    energyAvailable: sumIdeal,
    settleStep: settle,
    oscillationV: osc,
  };
}

export const ALGORITHM_INFO: Record<MpptAlgorithm, { name: string; summary: string }> = {
  po: {
    name: "Perturb & Observe",
    summary:
      "Nudges the voltage a little and checks whether power went up. If it did, keep going; if not, reverse. Simple, but it keeps oscillating around the peak.",
  },
  inc: {
    name: "Incremental Conductance",
    summary:
      "Compares dI/dV with −I/V. They are equal exactly at the maximum power point, so it can stop moving once it gets there and reacts well to changing sunlight.",
  },
};

// ---------------------------------------------------------------------------
// Daily energy yield
// ---------------------------------------------------------------------------

export interface SeasonPreset {
  id: string;
  label: string;
  sunrise: number;
  sunset: number;
  peakG: number;
  tMin: number;
  tMax: number;
  cloudiness: number; // 0..1
}

export const SEASONS: SeasonPreset[] = [
  { id: "summer", label: "Summer", sunrise: 5.5, sunset: 19.2, peakG: 1050, tMin: 24, tMax: 38, cloudiness: 0.15 },
  { id: "monsoon", label: "Monsoon", sunrise: 6.0, sunset: 18.9, peakG: 780, tMin: 23, tMax: 29, cloudiness: 0.6 },
  { id: "autumn", label: "Autumn", sunrise: 6.2, sunset: 18.1, peakG: 940, tMin: 18, tMax: 31, cloudiness: 0.2 },
  { id: "winter", label: "Winter", sunrise: 7.0, sunset: 17.7, peakG: 820, tMin: 10, tMax: 25, cloudiness: 0.1 },
];

export interface DayYieldSettings {
  season: SeasonPreset;
  cells: number; // cells in series per panel
  panels: number;
  area: number; // cm^2 per cell
  noct: number; // nominal operating cell temp, °C
  Rs: number;
  seed: number;
  soiling: number; // 0..0.3 loss fraction
}

export interface DayRow {
  hour: number;
  G: number;
  ambient: number;
  cellTemp: number;
  power: number; // W of the whole array
  efficiency: number;
}

export interface DayYieldResult {
  rows: DayRow[];
  energyWh: number;
  peakPower: number;
  peakHour: number;
  sunHours: number; // equivalent peak sun hours
  capacityFactor: number; // %
  avgEfficiency: number;
}

export function dayYield(s: DayYieldSettings): DayYieldResult {
  const rand = mulberry32(s.seed);
  const rows: DayRow[] = [];
  const dt = 0.25; // hours
  const day = s.season.sunset - s.season.sunrise;
  let energy = 0;
  let peak = 0;
  let peakHour = 0;
  let gSum = 0;
  let effSum = 0;
  let effN = 0;
  let cloud = 1;

  for (let h = 0; h <= 24 + 1e-9; h += dt) {
    const sunPos = (h - s.season.sunrise) / day;
    let clear = 0;
    if (sunPos > 0 && sunPos < 1) clear = s.season.peakG * Math.pow(Math.sin(Math.PI * sunPos), 1.25);

    const target = 1 - s.season.cloudiness * rand();
    cloud = lerp(cloud, target, 0.45);
    const G = clear * cloud * (1 - clamp(s.soiling, 0, 0.3));

    const ambient =
      (s.season.tMax + s.season.tMin) / 2 +
      ((s.season.tMax - s.season.tMin) / 2) * Math.sin(((h - 9) / 24) * 2 * Math.PI);
    const cellTemp = ambient + (G * (s.noct - 20)) / 800;

    let power = 0;
    let eff = 0;
    if (G > 20) {
      const m = cellMetrics({ intensity: G, temperature: cellTemp, series: s.cells, Rs: s.Rs, area: s.area });
      power = m.Pmax * s.panels;
      eff = m.efficiency;
      effSum += eff;
      effN++;
    }
    rows.push({ hour: +h.toFixed(2), G, ambient, cellTemp, power, efficiency: eff });
    energy += power * dt;
    gSum += G * dt;
    if (power > peak) {
      peak = power;
      peakHour = h;
    }
  }

  const stc = cellMetrics({ intensity: 1000, temperature: 25, series: s.cells, Rs: s.Rs, area: s.area });
  const rated = stc.Pmax * s.panels;
  return {
    rows,
    energyWh: energy,
    peakPower: peak,
    peakHour,
    sunHours: gSum / 1000,
    capacityFactor: rated > 0 ? (energy / (rated * 24)) * 100 : 0,
    avgEfficiency: effN ? effSum / effN : 0,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers used by the UI
// ---------------------------------------------------------------------------

export function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

export function fmtMilli(x: number, digits = 2): string {
  return fmt(x * 1000, digits);
}

export function fmtHour(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
