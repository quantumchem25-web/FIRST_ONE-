import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Crosshair } from "lucide-react";
import {
  runMppt, ALGORITHM_INFO, fmt, toCSV, downloadText,
  type MpptAlgorithm, type IrradianceProfile,
} from "@/lib/studio";
import { AXIS, GRID, COLORS, ChartTip, ExportButton, InfoNote, LabeledSlider, Panel, Segmented, Stat } from "./ui";

export function MpptPanel() {
  const [algorithm, setAlgorithm] = useState<MpptAlgorithm>("po");
  const [profile, setProfile] = useState<IrradianceProfile>("step");
  const [stepV, setStepV] = useState(0.02);
  const [steps, setSteps] = useState(160);
  const [cells, setCells] = useState(6);
  const [startV, setStartV] = useState(0.5);
  const [temperature, setTemperature] = useState(30);
  const [baseIntensity, setBaseIntensity] = useState(1000);

  const settings = { profile, steps, stepV, cells, temperature, baseIntensity, startV, Rs: 0.3 };
  const po = useMemo(() => runMppt({ ...settings, algorithm: "po" }), [profile, steps, stepV, cells, temperature, baseIntensity, startV]);
  const inc = useMemo(() => runMppt({ ...settings, algorithm: "inc" }), [profile, steps, stepV, cells, temperature, baseIntensity, startV]);
  const active = algorithm === "po" ? po : inc;
  const other = algorithm === "po" ? inc : po;

  const data = active.samples.map((s) => ({
    t: s.t,
    P: +(s.P * 1000).toFixed(3),
    Pideal: +(s.Pideal * 1000).toFixed(3),
    V: +s.V.toFixed(4),
    Vmp: +s.Vmp.toFixed(4),
    G: Math.round(s.G),
  }));

  const exportCsv = () => {
    const headers = ["step", "G (W/m2)", "V (V)", "I (mA)", "P (mW)", "P ideal (mW)"];
    const body = active.samples.map((s) => [s.t, Math.round(s.G), fmt(s.V, 4), fmt(s.I * 1000, 3), fmt(s.P * 1000, 3), fmt(s.Pideal * 1000, 3)]);
    downloadText(`photon-mppt-${algorithm}.csv`, toCSV(headers, body));
  };

  const winner = po.trackingEfficiency === inc.trackingEfficiency ? "tie" : po.trackingEfficiency > inc.trackingEfficiency ? "po" : "inc";

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      <Panel title="Tracker setup" icon={<Crosshair className="w-4 h-4 text-[var(--neon-cyan)]" />}>
        <div className="space-y-5">
          <Segmented<MpptAlgorithm>
            label="Algorithm shown in the charts"
            value={algorithm}
            onChange={setAlgorithm}
            options={[
              { id: "po", label: "Perturb & Observe" },
              { id: "inc", label: "Inc. Conductance" },
            ]}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">{ALGORITHM_INFO[algorithm].summary}</p>
          <Segmented<IrradianceProfile>
            label="Sunlight pattern"
            value={profile}
            onChange={setProfile}
            options={[
              { id: "steady", label: "Steady" },
              { id: "step", label: "Step changes" },
              { id: "ramp", label: "Sunrise ramp" },
              { id: "clouds", label: "Passing clouds" },
            ]}
          />
          <LabeledSlider label="Perturbation step" unit="V" min={0.005} max={0.1} step={0.005} digits={3} value={stepV} onChange={setStepV}
            hint="Big steps react fast but oscillate; small steps are smooth but slow." />
          <LabeledSlider label="Starting voltage" unit="V" min={0.1} max={3} step={0.1} digits={1} value={startV} onChange={setStartV} />
          <LabeledSlider label="Cells in series" min={2} max={12} value={cells} onChange={(v) => setCells(Math.round(v))} />
          <LabeledSlider label="Peak intensity" unit="W/m²" min={400} max={1500} step={50} value={baseIntensity} onChange={setBaseIntensity} />
          <LabeledSlider label="Temperature" unit="°C" min={0} max={75} value={temperature} onChange={setTemperature} />
          <LabeledSlider label="Simulation length" unit="steps" min={60} max={300} step={10} value={steps} onChange={(v) => setSteps(Math.round(v))} />
          <ExportButton onClick={exportCsv} label="Export run CSV" />
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Tracked power vs the ideal maximum">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="t" stroke={AXIS} fontSize={11} />
              <YAxis stroke={AXIS} fontSize={11} />
              <Tooltip content={<ChartTip labelFormatter={(l) => `Step ${l}`} valueFormatter={(v) => `${v.toFixed(2)} mW`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="stepAfter" dataKey="Pideal" name="Ideal Pmax" stroke={COLORS.pink} strokeDasharray="5 4" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="P" name={ALGORITHM_INFO[algorithm].name} stroke={COLORS.cyan} strokeWidth={2.4} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Operating voltage chasing the MPP voltage">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="t" stroke={AXIS} fontSize={11} />
              <YAxis stroke={AXIS} fontSize={11} tickFormatter={(v) => Number(v).toFixed(1)} />
              <Tooltip content={<ChartTip labelFormatter={(l) => `Step ${l}`} valueFormatter={(v) => `${v.toFixed(3)} V`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="stepAfter" dataKey="Vmp" name="True Vmp" stroke={COLORS.pink} strokeDasharray="5 4" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="V" name="Operating V" stroke={COLORS.purple} strokeWidth={2.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Scoreboard">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Tracking efficiency" value={fmt(active.trackingEfficiency, 2)} unit="%" tone="cyan" />
            <Stat label="Settling time" value={active.settleStep >= 0 ? String(active.settleStep) : "never"} unit={active.settleStep >= 0 ? "steps" : ""} tone="purple" />
            <Stat label="Avg. |ΔV| at steady" value={fmt(active.oscillationV * 1000, 1)} unit="mV" tone="pink" />
            <Stat label="Energy captured" value={fmt(active.energyHarvested * 1000, 1)} unit="mW·step" tone="plain" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead className="text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Algorithm</th>
                  <th className="px-3 py-2 text-right">Efficiency</th>
                  <th className="px-3 py-2 text-right">Settling</th>
                  <th className="px-3 py-2 text-right">Ripple</th>
                </tr>
              </thead>
              <tbody>
                {[{ id: "po", r: po }, { id: "inc", r: inc }].map(({ id, r }) => (
                  <tr key={id} className="border-t border-border/30">
                    <td className="px-3 py-2">
                      {ALGORITHM_INFO[id as MpptAlgorithm].name} {winner === id ? "🏆" : ""}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--neon-cyan)]">{fmt(r.trackingEfficiency, 2)}%</td>
                    <td className="px-3 py-2 text-right">{r.settleStep >= 0 ? `${r.settleStep} steps` : "—"}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.oscillationV * 1000, 1)} mV</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <InfoNote>
              {winner === "tie"
                ? "Both algorithms performed the same on this sunlight pattern."
                : `${ALGORITHM_INFO[winner === "po" ? "po" : "inc"].name} captured ${fmt(Math.abs(po.trackingEfficiency - inc.trackingEfficiency), 2)} percentage points more of the available energy than ${ALGORITHM_INFO[winner === "po" ? "inc" : "po"].name}. Try the “Passing clouds” pattern and a larger step to see how they differ.`}
              {" "}Other algorithm: {fmt(other.trackingEfficiency, 2)}%.
            </InfoNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
