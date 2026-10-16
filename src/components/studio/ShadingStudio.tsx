import { useMemo, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot, Legend,
} from "recharts";
import { CloudSun, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  computeShadedString, shadingPresets, makeShade, fmt, clamp,
  type ShadingConfig,
} from "@/lib/studio";
import { AXIS, GRID, COLORS, ChartTip, InfoNote, LabeledSlider, Panel, Stat, Toggle } from "./ui";

const CELLS = 12;

export function ShadingStudio() {
  const [shade, setShade] = useState<number[]>(() => new Array(CELLS).fill(0));
  const [bypass, setBypass] = useState(true);
  const [groupSize, setGroupSize] = useState(4);
  const [intensity, setIntensity] = useState(1000);
  const [temperature, setTemperature] = useState(25);
  const [brush, setBrush] = useState(0.7);
  const [presetId, setPresetId] = useState("half");

  const presets = useMemo(() => shadingPresets(CELLS), []);

  const cfg: ShadingConfig = useMemo(
    () => ({ cells: CELLS, shade, groupSize, bypass, intensity, temperature, area: 4 }),
    [shade, groupSize, bypass, intensity, temperature],
  );

  const result = useMemo(() => computeShadedString(cfg), [cfg]);
  const noBypass = useMemo(() => computeShadedString({ ...cfg, bypass: false }), [cfg]);
  const withBypass = useMemo(() => computeShadedString({ ...cfg, bypass: true }), [cfg]);

  const data = result.curve.map((p) => ({ V: +p.V.toFixed(4), P: +(p.P * 1000).toFixed(4), I: +(p.I * 1000).toFixed(4) }));

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setShade(makeShade(CELLS, p.shaded, p.level));
  };

  const toggleCell = (i: number) => {
    setPresetId("custom");
    setShade((s) => {
      const next = s.slice();
      next[i] = next[i] > 0 ? 0 : brush;
      return next;
    });
  };

  const gain = noBypass.Pmax > 0 ? (withBypass.Pmax / noBypass.Pmax - 1) * 100 : 0;
  const groups = result.groups;
  const anyShade = shade.some((s) => s > 0);

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5">
      <Panel title="Shade designer" icon={<CloudSun className="w-4 h-4 text-[var(--neon-cyan)]" />}>
        <div className="space-y-5">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Scenario</div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.description}
                  onClick={() => applyPreset(p.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                    presetId === p.id
                      ? "border-[var(--neon-cyan)] bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] text-[var(--neon-cyan)]"
                      : "border-border/50 glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              {presets.find((p) => p.id === presetId)?.description ?? "Custom shade pattern"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Tap cells to shade them ({CELLS} cells in series)</div>
            <div className="space-y-2">
              {groups.map((g, gi) => (
                <div key={gi} className="flex items-center gap-2">
                  <div className="text-[10px] w-6 text-muted-foreground tabular-nums">D{gi + 1}</div>
                  <div className={`flex-1 grid gap-1.5 p-1.5 rounded-lg ${bypass ? "border border-dashed border-[var(--neon-purple)]/60" : ""}`}
                    style={{ gridTemplateColumns: `repeat(${g.length}, minmax(0, 1fr))` }}>
                    {g.map((idx) => {
                      const s = shade[idx];
                      const hot = result.hotSpotCells.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleCell(idx)}
                          aria-label={`Cell ${idx + 1}`}
                          className="h-10 rounded-md border text-[10px] font-medium tabular-nums transition hover:scale-105 relative"
                          style={{
                            borderColor: hot ? "var(--neon-pink)" : "oklch(1 0 0 / 0.15)",
                            background: `linear-gradient(160deg, color-mix(in oklab, var(--neon-cyan) ${Math.round((1 - s) * 55)}%, #0b1020), #0b1020)`,
                            color: s > 0.5 ? "oklch(0.7 0.03 255)" : "white",
                            boxShadow: hot ? "0 0 10px var(--neon-pink)" : undefined,
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Pink glow = cell is pushed into reverse bias at the maximum power point (hot-spot risk).
            </div>
          </div>

          <LabeledSlider label="Shade strength when tapping" unit="%" min={10} max={100} step={5}
            value={Math.round(brush * 100)} onChange={(v) => setBrush(clamp(v / 100, 0.1, 1))} />
          <Toggle label="Bypass diodes" checked={bypass} onChange={setBypass} hint="One diode across each group lets current skip a shaded group." />
          {bypass && <LabeledSlider label="Cells per bypass diode" min={2} max={6} step={1} value={groupSize} onChange={(v) => setGroupSize(Math.round(v))} />}
          <LabeledSlider label="Light intensity" unit="W/m²" min={200} max={1500} step={50} value={intensity} onChange={setIntensity} />
          <LabeledSlider label="Temperature" unit="°C" min={0} max={75} value={temperature} onChange={setTemperature} />
          <button type="button" onClick={() => { setShade(new Array(CELLS).fill(0)); setPresetId("clear"); }}
            className="text-xs px-3 py-1.5 rounded-lg glass hover:text-[var(--neon-cyan)] transition">
            Reset all cells
          </button>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="P–V curve of the string" right={result.peaks.length > 1 ? (
          <span className="text-[11px] px-2 py-1 rounded-md bg-[color-mix(in_oklab,var(--neon-pink)_20%,transparent)] text-[var(--neon-pink)]">
            {result.peaks.length} peaks detected
          </span>
        ) : null}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="V" type="number" domain={[0, "dataMax"]} stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toFixed(1)} />
              <YAxis yAxisId="p" stroke={AXIS} fontSize={11} />
              <YAxis yAxisId="i" orientation="right" stroke={AXIS} fontSize={11} />
              <Tooltip content={<ChartTip labelFormatter={(l) => `V = ${Number(l).toFixed(2)} V`} valueFormatter={(v, k) => `${v.toFixed(2)} ${k === "P" ? "mW" : "mA"}`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="p" type="monotone" dataKey="P" name="Power" stroke={COLORS.purple} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="i" type="monotone" dataKey="I" name="Current" stroke={COLORS.cyan} strokeWidth={1.8} dot={false} isAnimationActive={false} />
              {result.peaks.map((p, i) => (
                <ReferenceDot key={i} yAxisId="p" x={+p.V.toFixed(4)} y={+(p.P * 1000).toFixed(4)} r={5}
                  fill={p === result.globalPeak ? "var(--neon-pink)" : "var(--neon-cyan)"} stroke="white" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Results">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Pmax" value={fmt(result.Pmax * 1000, 2)} unit="mW" tone="purple" />
            <Stat label="Ideal Pmax" value={fmt(result.idealPmax * 1000, 2)} unit="mW" tone="plain" />
            <Stat label="Shading loss" value={fmt(result.lossPct, 1)} unit="%" tone="pink" />
            <Stat label="Hot cells" value={String(result.hotSpotCells.length)} tone={result.hotSpotCells.length ? "pink" : "cyan"} />
            <Stat label="Vmp" value={fmt(result.Vmp, 2)} unit="V" tone="cyan" />
            <Stat label="Imp" value={fmt(result.Imp * 1000, 2)} unit="mA" tone="cyan" />
            <Stat label="Voc" value={fmt(result.Voc, 2)} unit="V" tone="plain" />
            <Stat label="Isc" value={fmt(result.Isc * 1000, 2)} unit="mA" tone="plain" />
          </div>
        </Panel>

        <Panel title="Do bypass diodes help here?">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="w-4 h-4 text-[var(--neon-pink)]" /> Without bypass</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--neon-pink)]">{fmt(noBypass.Pmax * 1000, 2)} <span className="text-xs text-muted-foreground">mW</span></div>
              <div className="text-[11px] text-muted-foreground">Loss {fmt(noBypass.lossPct, 1)}% · {noBypass.hotSpotCells.length} hot cell(s)</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="w-4 h-4 text-[var(--neon-cyan)]" /> With bypass ({groupSize} cells / diode)</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--neon-cyan)]">{fmt(withBypass.Pmax * 1000, 2)} <span className="text-xs text-muted-foreground">mW</span></div>
              <div className="text-[11px] text-muted-foreground">Loss {fmt(withBypass.lossPct, 1)}% · {withBypass.hotSpotCells.length} hot cell(s)</div>
            </div>
          </div>
          <div className="mt-4">
            <InfoNote>
              {!anyShade
                ? "Shade a few cells above to see what the bypass diodes do. With full sun both results are identical."
                : gain > 0.5
                  ? `Bypass diodes recover about ${fmt(gain, 1)}% more power in this scenario, and they protect shaded cells from overheating.`
                  : "In this scenario the diodes add little power, but they still keep the shaded cells from being driven hard in reverse."}
            </InfoNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
