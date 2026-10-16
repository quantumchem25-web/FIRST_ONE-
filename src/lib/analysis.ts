// Analysis utilities for the Explorer page: parameter sweeps, temperature
// coefficients, MPPT tracking (perturb & observe), daily energy yield and CSV export.
import { computeCell, type CellParams, type CellResult, type IVPoint } from "./physics";

export type SweepVariable = "intensity" | "temperature";
export type Metric = "Isc" | "Voc" | "Pmax" | "FF" | "efficiency";

export const METRIC_INFO: Record<Metric, { label: string; unit: string; digits: number }> = {
  Isc: { label: "Short-circuit current", unit: "mA", digits: 2 },
  Voc: { label: "Open-circuit voltage", unit: "V", digits: 3 },
  Pmax: { label: "Maximum power", unit: "mW", digits: 2 },
  FF: { label: "Fill factor", unit: "", digits: 3 },
  efficiency: { label: "Efficiency", unit: "%", digits: 2 },
};

export const SWEEP_RANGE: Record<SweepVariable, { min: number; max: number; step: number; unit: string; label: string }> = {
  intensity: { min: 200, max: 1500, step: 50, unit: "W/m²", label: "Irradiance" },
  temperature: { min: 0, max: 75, step: 5, unit: "°C", label: "Temperature" },
};

export interface SweepPoint {
  x: number;
  Isc: number;
  Voc: number;
  Pmax: number;
  FF: number;
  efficiency: number;
}

/** Convert a CellResult into display units (mA, V, mW). */
export function metricValue(r: CellResult, m: Metric): number {
  switch (m) {
    case "Isc": return r.Isc * 1000;
    case "Voc": return r.Voc;
    case "Pmax": return r.Pmax * 1000;
    case "FF": return r.FF;
    case "efficiency": return r.efficiency;
  }
}

export function formatMetric(value: number, m: Metric): string {
  const info = METRIC_INFO[m];
  return `${value.toFixed(info.digits)}${info.unit ? " " + info.unit : ""}`;
}

/** Sweep one variable while holding the rest of the parameters fixed. */
export function sweep(variable: SweepVariable, base: CellParams): SweepPoint[] {
  const { min, max, step } = SWEEP_RANGE[variable];
  const out: SweepPoint[] = [];
  for (let x = min; x <= max + 1e-9; x += step) {
    const r = computeCell({ ...base, [variable]: x });
    out.push({
      x,
      Isc: metricValue(r, "Isc"),
      Voc: metricValue(r, "Voc"),
      Pmax: metricValue(r, "Pmax"),
      FF: metricValue(r, "FF"),
      efficiency: metricValue(r, "efficiency"),
    });
  }
  return out;
}

/** Simple least-squares linear regression. */
export function linearFit(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = sxx === 0 || syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export interface TempCoefficients {
  dVocPerC: number; // mV/°C
  dIscPerC: number; // mA/°C
  dPmaxPerC: number; // mW/°C
  relPmaxPctPerC: number; // %/°C relative to 25°C
  r2Voc: number;
}

/** Temperature coefficients estimated from a temperature sweep at the given irradiance. */
export function temperatureCoefficients(base: CellParams): TempCoefficients {
  const pts = sweep("temperature", base);
  const xs = pts.map(p => p.x);
  const voc = linearFit(xs, pts.map(p => p.Voc * 1000));
  const isc = linearFit(xs, pts.map(p => p.Isc));
  const pm = linearFit(xs, pts.map(p => p.Pmax));
  const ref = computeCell({ ...base, temperature: 25 });
  const pRef = ref.Pmax * 1000;
  return {
    dVocPerC: voc.slope,
    dIscPerC: isc.slope,
    dPmaxPerC: pm.slope,
    relPmaxPctPerC: pRef > 0 ? (pm.slope / pRef) * 100 : 0,
    r2Voc: voc.r2,
  };
}

/** Ideal vs. real light scaling: how far Voc deviates from a straight line. */
export function irradianceLinearity(base: CellParams) {
  const pts = sweep("intensity", base);
  const xs = pts.map(p => p.x);
  return {
    isc: linearFit(xs, pts.map(p => p.Isc)),
    voc: linearFit(xs, pts.map(p => p.Voc)),
  };
}

// ---------------------------------------------------------------------------
// MPPT: perturb & observe
// ---------------------------------------------------------------------------

export interface MpptStep {
  k: number;
  V: number;
  I: number;
  P: number;
  Pmax: number;
  intensity: number;
}

export interface MpptOptions {
  steps: number;
  stepV: number; // perturbation size in volts
  startV: number;
  /** irradiance as a function of step index, defaults to constant */
  intensityAt?: (k: number) => number;
  temperature: number;
}

function currentAt(curve: IVPoint[], V: number): number {
  if (curve.length === 0) return 0;
  if (V <= curve[0].V) return curve[0].I;
  const last = curve[curve.length - 1];
  if (V >= last.V) return last.I;
  // curve is uniformly spaced in V
  const dv = curve[1].V - curve[0].V;
  const idx = Math.min(curve.length - 2, Math.floor((V - curve[0].V) / dv));
  const a = curve[idx];
  const b = curve[idx + 1];
  const t = (V - a.V) / (b.V - a.V || 1);
  return a.I + t * (b.I - a.I);
}

export function simulateMppt(opts: MpptOptions): MpptStep[] {
  const out: MpptStep[] = [];
  let V = opts.startV;
  let dir = 1;
  let prevP = -1;
  for (let k = 0; k < opts.steps; k++) {
    const intensity = opts.intensityAt ? opts.intensityAt(k) : 1000;
    const cell = computeCell({ intensity, temperature: opts.temperature });
    V = Math.min(Math.max(V, 0.01), cell.Voc);
    const I = currentAt(cell.curve, V);
    const P = V * I;
    out.push({ k, V, I, P, Pmax: cell.Pmax, intensity });
    if (prevP >= 0 && P < prevP) dir = -dir; // got worse, reverse
    prevP = P;
    V += dir * opts.stepV;
  }
  return out;
}

export function mpptEfficiency(steps: MpptStep[]): number {
  let got = 0, ideal = 0;
  steps.forEach(s => { got += s.P; ideal += s.Pmax; });
  return ideal > 0 ? (got / ideal) * 100 : 0;
}

// ---------------------------------------------------------------------------
// Daily yield model
// ---------------------------------------------------------------------------

export interface DayPoint {
  hour: number;
  irradiance: number;
  ambient: number;
  cellTemp: number;
  power: number; // mW
  energy: number; // cumulative mWh
}

export type Sky = "clear" | "partly" | "overcast";

export const SKY_FACTOR: Record<Sky, number> = { clear: 1, partly: 0.62, overcast: 0.22 };

/** Half-sine irradiance between sunrise and sunset. */
export function irradianceAtHour(hour: number, peak: number, sunrise = 6, sunset = 18): number {
  if (hour <= sunrise || hour >= sunset) return 0;
  return peak * Math.sin((Math.PI * (hour - sunrise)) / (sunset - sunrise));
}

export interface DayOptions {
  peak: number; // W/m² at solar noon on a clear day
  sky: Sky;
  minAmbient: number;
  maxAmbient: number;
  area: number; // cm²
  cells: number;
  sunrise: number;
  sunset: number;
}

export function simulateDay(o: DayOptions): DayPoint[] {
  const out: DayPoint[] = [];
  let energy = 0;
  const dt = 0.5; // hours
  for (let h = 0; h <= 24; h += dt) {
    const irr = irradianceAtHour(h, o.peak * SKY_FACTOR[o.sky], o.sunrise, o.sunset);
    const mid = (o.maxAmbient + o.minAmbient) / 2;
    const amp = (o.maxAmbient - o.minAmbient) / 2;
    // ambient peaks around 14:00
    const ambient = mid + amp * Math.sin((2 * Math.PI * (h - 8)) / 24);
    // NOCT-style heating
    const cellTemp = ambient + (irr / 800) * 25;
    let power = 0;
    if (irr > 20) {
      const r = computeCell({
        intensity: Math.min(1500, Math.max(200, irr)),
        temperature: Math.min(75, Math.max(0, cellTemp)),
        area: o.area,
        cells: o.cells,
        mode: o.cells > 1 ? "series" : "single",
      });
      power = r.Pmax * 1000;
      if (irr < 200) power *= irr / 200; // linear fade below model range
    }
    energy += power * dt;
    out.push({ hour: h, irradiance: irr, ambient, cellTemp, power, energy });
  }
  return out;
}

export function daySummary(points: DayPoint[]) {
  const peak = points.reduce((m, p) => Math.max(m, p.power), 0);
  const total = points.length ? points[points.length - 1].energy : 0;
  const sunHours = points.reduce((s, p) => s + p.irradiance * 0.5, 0) / 1000;
  const hot = points.reduce((m, p) => Math.max(m, p.cellTemp), -Infinity);
  return { peak, total, sunHours, hot };
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
