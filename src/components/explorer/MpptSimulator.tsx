import { useEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Crosshair, Pause, Play, RotateCcw } from "lucide-react";
import { mpptEfficiency, simulateMppt } from "@/lib/analysis";

type Scenario = "steady" | "cloud" | "ramp";

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "steady", label: "Steady sun", hint: "Constant irradiance, the tracker settles on the peak." },
  { id: "cloud", label: "Passing cloud", hint: "Light dips mid-run, then recovers. Watch the tracker chase it." },
  { id: "ramp", label: "Morning ramp", hint: "Irradiance rises steadily like early morning." },
];

const TOTAL_STEPS = 120;

function intensityFor(s: Scenario, base: number): (k: number) => number {
  switch (s) {
    case "steady":
      return () => base;
    case "cloud":
      return k => {
        if (k > 40 && k < 80) {
          const t = (k - 40) / 40;
          return base * (1 - 0.65 * Math.sin(Math.PI * t));
        }
        return base;
      };
    case "ramp":
      return k => Math.max(200, base * (0.25 + 0.75 * (k / (TOTAL_STEPS - 1))));
  }
}

interface Props {
  intensity: number;
  temperature: number;
}

export function MpptSimulator({ intensity, temperature }: Props) {
  const [scenario, setScenario] = useState<Scenario>("cloud");
  const [stepV, setStepV] = useState(0.02);
  const [startV, setStartV] = useState(0.1);
  const [shown, setShown] = useState(TOTAL_STEPS);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const all = useMemo(
    () =>
      simulateMppt({
        steps: TOTAL_STEPS,
        stepV,
        startV,
        temperature,
        intensityAt: intensityFor(scenario, Math.max(300, intensity)),
      }),
    [scenario, stepV, startV, temperature, intensity],
  );

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setShown(s => {
        if (s >= TOTAL_STEPS) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 60);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  function play() {
    if (shown >= TOTAL_STEPS) setShown(1);
    setPlaying(p => !p);
  }

  function reset() {
    setPlaying(false);
    setShown(1);
  }

  const visible = all.slice(0, shown).map(s => ({
    k: s.k,
    tracker: s.P * 1000,
    ideal: s.Pmax * 1000,
    V: s.V,
  }));

  const eff = mpptEfficiency(all.slice(0, shown));
  const last = all[Math.max(0, shown - 1)];
  const scenarioHint = SCENARIOS.find(s => s.id === scenario)?.hint;

  return (
    <section className="glass-strong rounded-2xl p-6 gradient-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[var(--neon-cyan)]" /> MPPT tracker
        </h2>
        <div className="flex gap-2">
          <button onClick={play} className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? "Pause" : shown >= TOTAL_STEPS ? "Replay" : "Play"}
          </button>
          <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        A real solar system never sits at the peak by luck. A controller keeps nudging the voltage and keeps whichever
        direction gives more power. This is the classic <em>perturb and observe</em> method.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => {
              setScenario(s.id);
              setShown(TOTAL_STEPS);
              setPlaying(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              scenario === s.id ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{scenarioHint}</p>

      <div className="grid sm:grid-cols-2 gap-5 mt-4">
        <Slider label="Perturbation step" unit="V" value={stepV} min={0.005} max={0.08} step={0.005} onChange={setStepV} digits={3} />
        <Slider label="Starting voltage" unit="V" value={startV} min={0.05} max={0.55} step={0.05} onChange={setStartV} digits={2} />
      </div>

      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visible} margin={{ top: 10, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="k" stroke="currentColor" tick={{ fontSize: 11 }} label={{ value: "Control step", position: "insideBottom", offset: -8, fontSize: 11 }} />
            <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={44} domain={[0, "auto"]} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip
              contentStyle={{ background: "rgba(10,14,30,0.92)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(2)} mW`}
              labelFormatter={(l: number) => `Step ${l}`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ideal" name="Available (MPP)" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="tracker" name="Tracker output" stroke="var(--neon-cyan)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
        <Stat label="Tracking efficiency" value={`${eff.toFixed(1)}%`} />
        <Stat label="Voltage now" value={`${last.V.toFixed(3)} V`} />
        <Stat label="Power now" value={`${(last.P * 1000).toFixed(2)} mW`} />
      </div>
    </section>
  );
}

function Slider(props: { label: string; unit: string; value: number; min: number; max: number; step: number; digits: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{props.label}</span>
        <span className="tabular-nums text-foreground">
          {props.value.toFixed(props.digits)} {props.unit}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={e => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--neon-cyan)]"
      />
    </label>
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
