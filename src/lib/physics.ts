// Single-diode solar cell model + sweep utilities
const Q = 1.602e-19;
const K = 1.381e-23;

export type Combination = "series" | "parallel" | "single";

export interface CellParams {
  intensity: number; // W/m^2 (200..1500)
  temperature: number; // °C (0..75)
  area?: number; // cm^2 (per cell)
  cells?: number; // number of cells
  mode?: Combination;
}

export interface IVPoint { V: number; I: number; P: number; R: number }

export interface CellResult {
  curve: IVPoint[];
  Isc: number;
  Voc: number;
  Pmax: number;
  Vmp: number;
  Imp: number;
  Rmp: number;
  FF: number;
  efficiency: number; // %
  Pin: number;
  area: number;
}

// Reference at 1000 W/m^2, 25°C: Isc=0.040 A, Voc=0.62 V (typical small Si cell)
const ISC_REF = 0.040;
const VOC_REF = 0.62;
const N = 1.5; // ideality
const I0_REF = 1e-9;

export function computeCell({ intensity, temperature, area = 4, cells = 1, mode = "single" }: CellParams): CellResult {
  const T = 273.15 + temperature;
  const Vt = (N * K * T) / Q;
  const IscCell = ISC_REF * (intensity / 1000);
  const I0 = I0_REF * Math.pow(T / 298.15, 3) * Math.exp((1.12 * Q / K) * (1 / 298.15 - 1 / T));
  const VocCell = Math.max(0.05, Vt * Math.log(IscCell / I0 + 1));

  // Combination scaling
  const n = Math.max(1, Math.floor(cells));
  const seriesN = mode === "series" ? n : 1;
  const parallelN = mode === "parallel" ? n : 1;
  const Voc = VocCell * seriesN;
  const Isc = IscCell * parallelN;

  const curve: IVPoint[] = [];
  const steps = 140;
  for (let i = 0; i <= steps; i++) {
    const V = (Voc * 1.02 * i) / steps; // pack voltage
    const Vcell = V / seriesN;
    let Icell = IscCell - I0 * (Math.exp(Vcell / Vt) - 1);
    if (Icell < 0) Icell = 0;
    const I = Icell * parallelN; // pack current
    const P = V * I;
    const R = I > 1e-6 ? V / I : Infinity;
    curve.push({ V, I, P, R });
  }
  let Pmax = 0, Vmp = 0, Imp = 0;
  curve.forEach(p => { if (p.P > Pmax) { Pmax = p.P; Vmp = p.V; Imp = p.I; } });
  const Rmp = Imp > 0 ? Vmp / Imp : 0;
  const FF = Voc * Isc > 0 ? (Vmp * Imp) / (Voc * Isc) : 0;
  const totalArea = area * n;
  const Pin = (intensity * totalArea) / 10000; // area cm^2 -> m^2
  const efficiency = Pin > 0 ? (Pmax / Pin) * 100 : 0;
  return { curve, Isc, Voc, Pmax, Vmp, Imp, Rmp, FF, efficiency, Pin, area: totalArea };
}

// Find operating point for a given external load resistance R_load
export function operatingPoint(curve: IVPoint[], Rload: number): IVPoint {
  // Find intersection of I-V curve with line I = V/Rload
  // Iterate points to find sign change of f(V) = I_curve(V) - V/R
  let best = curve[0];
  let bestErr = Infinity;
  for (let i = 0; i < curve.length; i++) {
    const p = curve[i];
    const target = p.V / Rload;
    const err = Math.abs(p.I - target);
    if (err < bestErr) { bestErr = err; best = p; }
  }
  const P = best.V * best.I;
  return { V: best.V, I: best.I, P, R: Rload };
}
