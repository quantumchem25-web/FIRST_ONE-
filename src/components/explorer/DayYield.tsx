import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudSun, Download, Sunrise } from "lucide-react";
import { SKY_FACTOR, daySummary, downloadText, simulateDay, toCsv, type Sky } from "@/lib/analysis";

const SKIES: { id: Sky; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "partly", label: "Partly cloudy" },
  { id: "overcast", label: "Overcast" },
];

type View = "power" | "irradiance" | "temperature" | "energy";

const VIEWS: { id: View; label: string; unit: string; color: string }[] = [
  { id: "power", label: "Power", unit: "mW", color: "var(--neon-cyan)" },
  { id: "energy", label: "Energy", unit: "mWh", color: "#34d399" },
  { id: "irradiance", label: "Sunlight", unit: "W/m²", color: "#fbbf24" },
  { id: "temperature", label: "Cell temp", unit: "°C", color: "#f472b6" },
];

function hourLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = h % 1 === 0 ? "00" : "30";
  return `${String(hh).padStart(2, "0")}:${mm}`;
}

interface Props {
  area: number;
}

export function DayYield({ area }: Props) {
  const [peak, setPeak] = useState(1000);
  const [sky, setSky] = useState<Sky>("clear");
  const [minT, setMinT] = useState(18);
  const [maxT, setMaxT] = useState(34);
  const [cells, setCells] = useState(1);
  const [sunrise, setSunrise] = useState(6);
  const [sunset, setSunset] = useState(18);
  const [view, setView] = useState<View>("power");

  const points = useMemo(
    () =>
      simulateDay({
        peak,
        sky,
        minAmbient: Math.min(minT, maxT),
        maxAmbient: Math.max(minT, maxT),
        area,
        cells,
        sunrise,
        sunset: Math.max(sunset, sunrise + 2),
      }),
    [peak, sky, minT, maxT, area, cells, sunrise, sunset],
  );

  const summary = useMemo(() => daySummary(points), [points]);
  const meta = VIEWS.find(v => v.id === view)!;

  const chartData = points.map(p => ({
    label: hourLabel(p.hour),
    power: p.power,
    energy: p.energy,
    irradiance: p.irradiance,
    temperature: p.cellTemp,
  }));

  function exportCsv() {
    const csv = toCsv(
      ["Time", "Irradiance (W/m2)", "Ambient (C)", "Cell temp (C)", "Power (mW)", "Energy (mWh)"],
      points.map(p => [hourLabel(p.hour), p.irradiance.toFixed(1), p.ambient.toFixed(1), p.cellTemp.toFixed(1), p.power.toFixed(3), p.energy.toFixed(3)]),
    );
    downloadText("day-yield.csv", csv);
  }

  const usable = summary.total / 1000; // Wh

  return (
    <section className="glass-strong rounded-2xl p-6 gradient-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-[var(--neon-cyan)]" /> A day in the sun
        </h2>
        <button onClick={exportCsv} className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Sunlight changes through the day, and so does the cell temperature. See how much energy your panel could collect
        from sunrise to sunset.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        {SKIES.map(s => (
          <button
            key={s.id}
            onClick={() => setSky(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              sky === s.id ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label} <span className="text-[10px] opacity-70">×{SKY_FACTOR[s.id]}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-5">
        <Range label="Peak sunlight" unit="W/m²" value={peak} min={400} max={1200} step={50} onChange={setPeak} />
        <Range label="Number of cells (series)" unit="" value={cells} min={1} max={12} step={1} onChange={setCells} />
        <Range label="Night temperature" unit="°C" value={minT} min={-5} max={30} step={1} onChange={setMinT} />
        <Range label="Afternoon temperature" unit="°C" value={maxT} min={5} max={45} step={1} onChange={setMaxT} />
        <Range label="Sunrise" unit="h" value={sunrise} min={4} max={9} step={1} onChange={setSunrise} />
        <Range label="Sunset" unit="h" value={sunset} min={15} max={21} step={1} onChange={setSunset} />
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              view === v.id ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="h-64 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="dayFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={meta.color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="currentColor" tick={{ fontSize: 11 }} interval={5} />
            <YAxis stroke="currentColor" tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip
              contentStyle={{ background: "rgba(10,14,30,0.92)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => `${v.toFixed(2)} ${meta.unit}`}
            />
            <Area type="monotone" dataKey={view} name={meta.label} stroke={meta.color} strokeWidth={2.2} fill="url(#dayFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-center">
        <Stat label="Peak power" value={`${summary.peak.toFixed(1)} mW`} />
        <Stat label="Energy collected" value={`${usable.toFixed(3)} Wh`} />
        <Stat label="Peak sun hours" value={`${summary.sunHours.toFixed(2)} h`} />
        <Stat label="Hottest cell" value={`${summary.hot.toFixed(1)} °C`} />
      </div>
      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
        <Sunrise className="w-3.5 h-3.5" /> Cell temperature is the air temperature plus a heating term that grows with
        sunlight, so midday panels run hotter than the air around them.
      </p>
    </section>
  );
}

function Range(props: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{props.label}</span>
        <span className="tabular-nums text-foreground">
          {props.value} {props.unit}
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
