import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CloudOff, Layers, Zap } from "lucide-react";
import { fmt, moduleCurve, type ModuleConfig } from "@/lib/solarModel";
import { Insight, Panel, Slider, StatCard, Toggle, axisProps, chartTooltipStyle } from "./ui";

const PRESETS: { name: string; shade: number[]; note: string }[] = [
  { name: "Clear sky", shade: [0, 0, 0], note: "No shading at all" },
  { name: "Leaf on one cell group", shade: [0.6, 0, 0], note: "Part of the first group is covered" },
  { name: "Chimney shadow", shade: [0.9, 0.5, 0], note: "Shadow sweeping across the module" },
  { name: "Heavy bird dropping", shade: [0.95, 0, 0], note: "One group nearly blocked" },
  { name: "Half covered", shade: [0.8, 0.8, 0], note: "Two groups in the shade" },
];

export function ShadingPanel() {
  const [irradiance, setIrradiance] = useState(1000);
  const [temp, setTemp] = useState(25);
  const [bypass, setBypass] = useState(true);
  const [substrings, setSubstrings] = useState(3);
  const [shade, setShade] = useState<number[]>([0.8, 0, 0]);

  const cfg: ModuleConfig = useMemo(
    () => ({ cellsPerSubstring: Math.round(60 / substrings), substrings, bypass }),
    [substrings, bypass],
  );

  const effShade = useMemo(
    () => Array.from({ length: substrings }, (_, i) => shade[i] ?? 0),
    [shade, substrings],
  );

  const clear = useMemo(() => moduleCurve(cfg, effShade.map(() => 0), irradiance, temp), [cfg, effShade, irradiance, temp]);
  const shaded = useMemo(() => moduleCurve(cfg, effShade, irradiance, temp), [cfg, effShade, irradiance, temp]);

  const loss = clear.pmax > 0 ? (1 - shaded.pmax / clear.pmax) * 100 : 0;
  const shadedCells = effShade.reduce((a, s) => a + s, 0) / substrings;

  const setOne = (i: number, v: number) =>
    setShade((prev) => {
      const next = Array.from({ length: 6 }, (_, k) => prev[k] ?? 0);
      next[i] = v;
      return next;
    });

  const pv = (arr: typeof clear.curve) =>
    arr.map((p) => ({ V: Number(p.V.toFixed(2)), P: Number(p.P.toFixed(1)), I: Number(p.I.toFixed(2)) }));

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Shade the module" subtitle="Each block is one bypass-diode group (substring)">
        <div className="space-y-4">
          <div className="grid gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setShade([...p.shade, 0, 0, 0].slice(0, 6))}
                className="glass rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
              >
                <div className="text-sm">{p.name}</div>
                <div className="text-[11px] text-muted-foreground">{p.note}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {effShade.map((s, i) => (
              <Slider
                key={i}
                label={`Group ${i + 1} shade`}
                value={s}
                min={0}
                max={0.95}
                step={0.05}
                onChange={(v) => setOne(i, v)}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            ))}
          </div>

          <Slider label="Bypass groups" value={substrings} min={1} max={6} onChange={setSubstrings} />
          <Slider label="Sunlight" value={irradiance} min={200} max={1200} step={50} unit="W/m²" onChange={setIrradiance} />
          <Slider label="Cell temperature" value={temp} min={0} max={80} unit="°C" onChange={setTemp} />
          <Toggle label="Bypass diodes fitted" checked={bypass} onChange={setBypass} />
        </div>
      </Panel>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Shaded Pmax" value={fmt(shaded.pmax, 1)} unit="W" icon={<Zap className="h-4 w-4" />} />
          <StatCard label="Clear Pmax" value={fmt(clear.pmax, 1)} unit="W" icon={<Layers className="h-4 w-4" />} />
          <StatCard label="Power lost" value={fmt(loss, 1)} unit="%" icon={<CloudOff className="h-4 w-4" />} />
          <StatCard label="Power peaks" value={String(shaded.peaks)} hint={shaded.peaks > 1 ? "Multi-peak curve" : "Single peak"} />
        </div>

        {shaded.peaks > 1 ? (
          <Insight tone="warn">
            The P-V curve has <b>{shaded.peaks} peaks</b>. A simple MPPT charger can lock onto the smaller one and waste
            even more power. This is why good inverters scan the whole curve.
          </Insight>
        ) : loss > 30 && !bypass ? (
          <Insight tone="warn">
            Without bypass diodes the shaded group acts like a resistor and drags the whole module down.
            Turn the bypass toggle on to compare.
          </Insight>
        ) : (
          <Insight tone="info">
            Average shading across the module is {fmt(shadedCells * 100, 0)}%. Try covering one group heavily and
            watch a second bump appear in the curve.
          </Insight>
        )}

        <Panel title="Power vs voltage (P-V)" subtitle="Dashed line = same module with no shade">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" dataKey="V" domain={[0, "dataMax"]} {...axisProps} unit=" V" />
                <YAxis type="number" dataKey="P" {...axisProps} unit=" W" width={58} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line data={pv(clear.curve)} dataKey="P" name="Unshaded" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line data={pv(shaded.curve)} dataKey="P" name="Shaded" stroke="#22d3ee" dot={false} strokeWidth={2.5} isAnimationActive={false} />
                <ReferenceDot x={shaded.vmp} y={shaded.pmax} r={6} fill="#facc15" stroke="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Current vs voltage (I-V)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" dataKey="V" domain={[0, "dataMax"]} {...axisProps} unit=" V" />
                <YAxis type="number" dataKey="I" {...axisProps} unit=" A" width={52} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line data={pv(clear.curve)} dataKey="I" name="Unshaded" stroke="#94a3b8" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line data={pv(shaded.curve)} dataKey="I" name="Shaded" stroke="#f472b6" dot={false} strokeWidth={2.5} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Module layout" subtitle="Brightness shows how much light each group receives">
          <div className="flex gap-2">
            {effShade.map((s, i) => (
              <div key={i} className="flex-1">
                <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-black/30 p-1">
                  {Array.from({ length: Math.min(cfg.cellsPerSubstring, 20) }).map((_, c) => (
                    <div
                      key={c}
                      className="aspect-square rounded-sm bg-cyan-400"
                      style={{ opacity: 1 - s * 0.9 }}
                    />
                  ))}
                </div>
                <div className="mt-1 text-center text-[11px] text-muted-foreground">
                  Group {i + 1} · {Math.round((1 - s) * 100)}% light
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
