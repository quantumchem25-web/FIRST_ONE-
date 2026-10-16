import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Thermometer, Sun } from "lucide-react";
import {
  sweepTemperature, sweepIrradiance, temperatureCoefficients, irradianceLaw,
  fmt, toCSV, downloadText,
  type SweepRow,
} from "@/lib/studio";
import { AXIS, GRID, COLORS, ChartTip, ExportButton, InfoNote, LabeledSlider, Panel, Segmented, Stat } from "./ui";

type Mode = "temperature" | "irradiance";
type Metric = "Pmax" | "Voc" | "Isc" | "FF" | "efficiency";

const METRICS: { id: Metric; label: string; unit: string; scale: number; digits: number; color: string }[] = [
  { id: "Pmax", label: "Pmax", unit: "mW", scale: 1000, digits: 2, color: COLORS.purple },
  { id: "Voc", label: "Voc", unit: "V", scale: 1, digits: 3, color: COLORS.cyan },
  { id: "Isc", label: "Isc", unit: "mA", scale: 1000, digits: 2, color: COLORS.pink },
  { id: "FF", label: "Fill factor", unit: "", scale: 1, digits: 3, color: COLORS.blue },
  { id: "efficiency", label: "Efficiency", unit: "%", scale: 1, digits: 2, color: COLORS.cyan },
];

export function SweepPanel() {
  const [mode, setMode] = useState<Mode>("temperature");
  const [metric, setMetric] = useState<Metric>("Pmax");
  const [fixedG, setFixedG] = useState(1000);
  const [fixedT, setFixedT] = useState(25);
  const [Rs, setRs] = useState(0.4);
  const [cells, setCells] = useState(1);
  const [compare, setCompare] = useState(true);

  const rows: SweepRow[] = useMemo(() => {
    if (mode === "temperature") {
      return sweepTemperature({ from: 0, to: 75, step: 2.5, fixed: fixedG, series: cells, Rs, area: 4 });
    }
    return sweepIrradiance({ from: 200, to: 1500, step: 50, fixed: fixedT, series: cells, Rs, area: 4 });
  }, [mode, fixedG, fixedT, Rs, cells]);

  const ideal: SweepRow[] = useMemo(() => {
    if (!compare) return [];
    if (mode === "temperature") {
      return sweepTemperature({ from: 0, to: 75, step: 2.5, fixed: fixedG, series: cells, Rs: 0, area: 4 });
    }
    return sweepIrradiance({ from: 200, to: 1500, step: 50, fixed: fixedT, series: cells, Rs: 0, area: 4 });
  }, [compare, mode, fixedG, fixedT, cells]);

  const m = METRICS.find((x) => x.id === metric)!;
  const data = rows.map((r, i) => ({
    x: r.x,
    value: +(r[metric] * m.scale).toFixed(5),
    ideal: ideal[i] ? +(ideal[i][metric] * m.scale).toFixed(5) : undefined,
  }));

  const tc = useMemo(() => temperatureCoefficients(rows), [rows]);
  const law = useMemo(() => irradianceLaw(rows), [rows]);

  const exportCsv = () => {
    const headers = [mode === "temperature" ? "T (C)" : "G (W/m2)", "Isc (mA)", "Voc (V)", "Pmax (mW)", "FF", "Eff (%)"];
    const body = rows.map((r) => [r.x, fmt(r.Isc * 1000, 4), fmt(r.Voc, 4), fmt(r.Pmax * 1000, 4), fmt(r.FF, 4), fmt(r.efficiency, 3)]);
    downloadText(`photon-${mode}-sweep.csv`, toCSV(headers, body));
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      <Panel title="Sweep controls" icon={mode === "temperature" ? <Thermometer className="w-4 h-4 text-[var(--neon-cyan)]" /> : <Sun className="w-4 h-4 text-[var(--neon-cyan)]" />}>
        <div className="space-y-5">
          <Segmented<Mode>
            label="Sweep variable"
            value={mode}
            onChange={setMode}
            options={[
              { id: "temperature", label: "Temperature" },
              { id: "irradiance", label: "Irradiance" },
            ]}
          />
          <Segmented<Metric>
            label="Quantity to plot"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((x) => ({ id: x.id, label: x.label }))}
          />
          {mode === "temperature" ? (
            <LabeledSlider label="Light intensity" unit="W/m²" min={200} max={1500} step={50} value={fixedG} onChange={setFixedG} />
          ) : (
            <LabeledSlider label="Cell temperature" unit="°C" min={0} max={75} step={1} value={fixedT} onChange={setFixedT} />
          )}
          <LabeledSlider label="Series resistance" unit="Ω" min={0} max={2} step={0.1} digits={1} value={Rs} onChange={setRs}
            hint="Higher Rs squares-off the curve less and lowers the fill factor." />
          <LabeledSlider label="Cells in series" min={1} max={12} step={1} value={cells} onChange={setCells} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-[var(--neon-cyan)]" />
            Compare with an ideal cell (Rs = 0)
          </label>
          <ExportButton onClick={exportCsv} label="Export sweep CSV" />
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title={`${m.label} vs ${mode === "temperature" ? "temperature (°C)" : "irradiance (W/m²)"}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="x" stroke={AXIS} fontSize={11} />
              <YAxis stroke={AXIS} fontSize={11} domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toFixed(m.digits > 2 ? 2 : 1)} />
              <Tooltip content={<ChartTip valueFormatter={(v) => `${v.toFixed(m.digits)} ${m.unit}`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" name={`${m.label} (Rs = ${Rs.toFixed(1)} Ω)`} dataKey="value" stroke={m.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              {compare && <Line type="monotone" name="Ideal cell" dataKey="ideal" stroke={COLORS.pink} strokeDasharray="5 4" strokeWidth={1.8} dot={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {mode === "temperature" ? (
          <Panel title="Temperature coefficients (linear fit)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="dVoc / dT" value={fmt(tc.vocPerC, 2)} unit="mV/°C" tone="cyan" sub={`R² = ${fmt(tc.r2Voc, 4)}`} />
              <Stat label="Voc coefficient" value={fmt(tc.vocPct, 3)} unit="%/°C" tone="purple" />
              <Stat label="Pmax coefficient" value={fmt(tc.pmaxPct, 3)} unit="%/°C" tone="pink" sub={`R² = ${fmt(tc.r2Pmax, 4)}`} />
              <Stat label="Isc coefficient" value={fmt(tc.iscPct, 4)} unit="%/°C" tone="plain" />
            </div>
            <div className="mt-4">
              <InfoNote>
                A silicon cell loses roughly 2 mV per °C in open-circuit voltage, while the current rises only a tiny bit.
                That is why panels give less power on hot afternoons even though the sun is strongest.
              </InfoNote>
            </div>
          </Panel>
        ) : (
          <Panel title="Irradiance laws (fitted)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Isc per kW/m²" value={fmt(law.iscPerKw, 2)} unit="mA" tone="cyan" />
              <Stat label="Voc per decade" value={fmt(law.vocLogSlope, 1)} unit="mV" tone="purple" />
              <Stat label="Pmax ∝ G^n, n =" value={fmt(law.pmaxExponent, 3)} tone="pink" sub={`R² = ${fmt(law.r2, 4)}`} />
              <Stat label="Cells" value={String(cells)} tone="plain" />
            </div>
            <div className="mt-4">
              <InfoNote>
                Isc grows linearly with light, but Voc grows only logarithmically. Output power therefore rises slightly faster than
                linearly (n a bit above 1) until series resistance starts to bite.
              </InfoNote>
            </div>
          </Panel>
        )}

        <Panel title="Data table">
          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-lg">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-[color-mix(in_oklab,var(--neon-cyan)_8%,var(--background))] text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">{mode === "temperature" ? "T (°C)" : "G (W/m²)"}</th>
                  <th className="px-3 py-2 text-right">Isc (mA)</th>
                  <th className="px-3 py-2 text-right">Voc (V)</th>
                  <th className="px-3 py-2 text-right">Pmax (mW)</th>
                  <th className="px-3 py-2 text-right">FF</th>
                  <th className="px-3 py-2 text-right">η (%)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.x} className="border-t border-border/30 hover:bg-[color-mix(in_oklab,var(--neon-cyan)_5%,transparent)]">
                    <td className="px-3 py-1.5">{r.x}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.Isc * 1000, 2)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.Voc, 3)}</td>
                    <td className="px-3 py-1.5 text-right text-[var(--neon-cyan)]">{fmt(r.Pmax * 1000, 2)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.FF, 3)}</td>
                    <td className="px-3 py-1.5 text-right">{fmt(r.efficiency, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
