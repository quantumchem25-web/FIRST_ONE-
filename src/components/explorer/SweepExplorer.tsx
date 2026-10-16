import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, SlidersHorizontal } from "lucide-react";
import {
  METRIC_INFO,
  SWEEP_RANGE,
  downloadText,
  sweep,
  toCsv,
  type Metric,
  type SweepVariable,
} from "@/lib/analysis";

const METRICS: Metric[] = ["Isc", "Voc", "Pmax", "FF", "efficiency"];

interface Props {
  intensity: number;
  temperature: number;
  area: number;
}

export function SweepExplorer({ intensity, temperature, area }: Props) {
  const [variable, setVariable] = useState<SweepVariable>("intensity");
  const [metric, setMetric] = useState<Metric>("Pmax");
  const [compare, setCompare] = useState(false);

  const other = variable === "intensity" ? "temperature" : "intensity";
  const range = SWEEP_RANGE[variable];
  const info = METRIC_INFO[metric];

  const data = useMemo(() => {
    const main = sweep(variable, { intensity, temperature, area });
    if (!compare) return main.map(p => ({ x: p.x, main: p[metric], alt: null as number | null }));
    // second line: the other variable moved to a contrasting value
    const altParams =
      variable === "intensity"
        ? { intensity, temperature: Math.min(75, temperature + 25), area }
        : { intensity: Math.max(200, intensity - 400), temperature, area };
    const alt = sweep(variable, altParams);
    return main.map((p, i) => ({ x: p.x, main: p[metric], alt: alt[i][metric] }));
  }, [variable, metric, intensity, temperature, area, compare]);

  const current = variable === "intensity" ? intensity : temperature;
  const values = data.map(d => d.main);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const change = lo !== 0 ? ((hi - lo) / Math.abs(lo)) * 100 : 0;

  const altLabel =
    variable === "intensity"
      ? `${Math.min(75, temperature + 25)} °C`
      : `${Math.max(200, intensity - 400)} W/m²`;

  function exportCsv() {
    const rows = sweep(variable, { intensity, temperature, area }).map(p => [
      p.x,
      p.Isc.toFixed(4),
      p.Voc.toFixed(4),
      p.Pmax.toFixed(4),
      p.FF.toFixed(4),
      p.efficiency.toFixed(4),
    ]);
    const csv = toCsv([`${range.label} (${range.unit})`, "Isc (mA)", "Voc (V)", "Pmax (mW)", "FF", "Efficiency (%)"], rows);
    downloadText(`sweep-${variable}.csv`, csv);
  }

  return (
    <section className="glass-strong rounded-2xl p-6 gradient-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[var(--neon-cyan)]" /> Parameter sweep
        </h2>
        <button
          onClick={exportCsv}
          className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Vary one quantity across its full range while {other === "temperature" ? "temperature" : "irradiance"} stays at
        your chosen value, and watch how a single result responds.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">X axis</div>
          <div className="flex gap-2">
            {(Object.keys(SWEEP_RANGE) as SweepVariable[]).map(v => (
              <button
                key={v}
                onClick={() => setVariable(v)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  variable === v ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {SWEEP_RANGE[v].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Y axis</div>
          <div className="flex flex-wrap gap-2">
            {METRICS.map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  metric === m ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "efficiency" ? "η" : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 mt-4 text-sm text-muted-foreground cursor-pointer select-none">
        <input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} className="accent-[var(--neon-cyan)]" />
        Overlay a second curve at {altLabel}
      </label>

      <div className="h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              stroke="currentColor"
              tick={{ fontSize: 11 }}
              label={{ value: `${range.label} (${range.unit})`, position: "insideBottom", offset: -8, fontSize: 11 }}
            />
            <YAxis
              stroke="currentColor"
              tick={{ fontSize: 11 }}
              width={52}
              tickFormatter={(v: number) => v.toFixed(info.digits > 2 ? 2 : 1)}
            />
            <Tooltip
              contentStyle={{ background: "rgba(10,14,30,0.92)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(info.digits)} ${info.unit}`}
              labelFormatter={(l: number) => `${range.label}: ${l} ${range.unit}`}
            />
            <ReferenceLine x={current} stroke="var(--neon-cyan)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="main" name="Selected" stroke="var(--neon-cyan)" strokeWidth={2.5} dot={false} />
            {compare && <Line type="monotone" dataKey="alt" name={altLabel} stroke="#f472b6" strokeWidth={2} strokeDasharray="6 4" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <Stat label="Lowest" value={`${lo.toFixed(info.digits)} ${info.unit}`} />
        <Stat label="Highest" value={`${hi.toFixed(info.digits)} ${info.unit}`} />
        <Stat label="Change over range" value={`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Dashed vertical line = your current {range.label.toLowerCase()} ({current} {range.unit}).
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl py-3 px-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
