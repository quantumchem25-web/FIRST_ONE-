import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Battery, Compass, Sun, Thermometer } from "lucide-react";
import {
  bestTilt,
  dayOfYearFromMonth,
  fmt,
  simulateDay,
  type SiteConfig,
} from "@/lib/solarModel";
import { Insight, Panel, Slider, StatCard, axisProps, chartTooltipStyle } from "./ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CITIES: { name: string; lat: number }[] = [
  { name: "Pune", lat: 18.5 },
  { name: "Delhi", lat: 28.6 },
  { name: "Chennai", lat: 13.1 },
  { name: "London", lat: 51.5 },
  { name: "Sydney", lat: -33.9 },
  { name: "Reykjavik", lat: 64.1 },
];

const hourLabel = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;

export function DayYieldPanel() {
  const [latitude, setLatitude] = useState(18.5);
  const [month, setMonth] = useState(9);
  const [tilt, setTilt] = useState(20);
  const [panelAzimuth, setPanelAzimuth] = useState(180);
  const [cloud, setCloud] = useState(0.1);
  const [ambient, setAmbient] = useState(30);
  const [panels, setPanels] = useState(6);

  const site: SiteConfig = useMemo(
    () => ({
      latitude,
      dayOfYear: dayOfYearFromMonth(month),
      tilt,
      panelAzimuth,
      cloud,
      ambient,
    }),
    [latitude, month, tilt, panelAzimuth, cloud, ambient],
  );

  const day = useMemo(() => simulateDay(site, 60), [site]);
  const optimum = useMemo(() => bestTilt(site, 60), [site]);

  const totalKWh = day.totalKWh * panels;
  const peakKW = (day.peakPower * panels) / 1000;
  const lossVsBest = optimum.kwh > 0 ? (1 - day.totalKWh / optimum.kwh) * 100 : 0;
  const co2 = totalKWh * 0.82; // kg CO2 avoided (grid factor approx.)

  const monthly = useMemo(
    () =>
      MONTHS.map((m, i) => {
        const r = simulateDay({ ...site, dayOfYear: dayOfYearFromMonth(i) }, 60, undefined, 1);
        return { month: m, kwh: Number((r.totalKWh * panels * 30).toFixed(1)) };
      }),
    [site, panels],
  );

  const yearly = monthly.reduce((a, b) => a + b.kwh, 0);

  const chartData = day.points.map((p) => ({
    label: hourLabel(p.hour),
    power: Number((p.power * panels).toFixed(0)),
    irradiance: Number(p.irradiance.toFixed(0)),
    energy: Number((p.energy * panels).toFixed(2)),
    cellTemp: Number(p.cellTemp.toFixed(1)),
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Site & array" subtitle="Tune the location, season and panel layout">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">Quick city</div>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setLatitude(c.lat)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${
                    Math.abs(latitude - c.lat) < 0.05
                      ? "bg-cyan-400/25 text-[var(--neon-cyan)]"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Latitude" value={latitude} min={-66} max={66} step={0.1} unit="°" onChange={setLatitude} />
          <div>
            <div className="mb-2 text-sm text-muted-foreground">Month</div>
            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMonth(i)}
                  className={`rounded-md py-1 text-[11px] transition ${
                    month === i ? "bg-cyan-400/25 text-[var(--neon-cyan)]" : "glass text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Slider label="Panel tilt" value={tilt} min={0} max={90} unit="°" onChange={setTilt} />
          <Slider
            label="Panel direction"
            value={panelAzimuth}
            min={90}
            max={270}
            step={5}
            unit="°"
            onChange={setPanelAzimuth}
            format={(v) => (v === 180 ? "180 (South)" : v < 180 ? `${v} (SE)` : `${v} (SW)`)}
          />
          <Slider
            label="Cloud cover"
            value={cloud}
            min={0}
            max={1}
            step={0.05}
            onChange={setCloud}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider label="Ambient temperature" value={ambient} min={-10} max={50} unit="°C" onChange={setAmbient} />
          <Slider label="Panels in array" value={panels} min={1} max={30} unit="× 60-cell" onChange={setPanels} />
        </div>
      </Panel>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Energy / day" value={fmt(totalKWh, 1)} unit="kWh" icon={<Battery className="h-4 w-4" />} />
          <StatCard label="Peak power" value={fmt(peakKW, 2)} unit="kW" hint={`at ${hourLabel(day.peakHour)}`} icon={<Sun className="h-4 w-4" />} />
          <StatCard label="Peak sun hours" value={fmt(day.sunHours, 1)} unit="h" icon={<Compass className="h-4 w-4" />} />
          <StatCard label="CO₂ avoided" value={fmt(co2, 1)} unit="kg/day" icon={<Thermometer className="h-4 w-4" />} />
        </div>

        {lossVsBest > 3 ? (
          <Insight tone="warn">
            Your tilt of {tilt}° gives about {fmt(lossVsBest, 0)}% less energy than the best tilt for this day
            (<b>{optimum.tilt}°</b>). Try moving the slider closer to it.
          </Insight>
        ) : (
          <Insight tone="good">
            Great tilt! You are within 3% of the best possible tilt for this day ({optimum.tilt}°).
          </Insight>
        )}

        <Panel title="Power output through the day" subtitle="Array AC-side estimate before inverter losses">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pwr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="label" interval={5} {...axisProps} />
                <YAxis {...axisProps} unit=" W" width={64} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="power" name="Power (W)" stroke="#22d3ee" fill="url(#pwr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid gap-5 md:grid-cols-2">
          <Panel title="Irradiance & cell temperature">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" interval={7} {...axisProps} />
                  <YAxis yAxisId="g" {...axisProps} width={48} />
                  <YAxis yAxisId="t" orientation="right" {...axisProps} width={40} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="g" type="monotone" dataKey="irradiance" name="W/m²" stroke="#facc15" dot={false} strokeWidth={2} />
                  <Line yAxisId="t" type="monotone" dataKey="cellTemp" name="Cell °C" stroke="#f472b6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Energy collected (cumulative)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" interval={7} {...axisProps} />
                  <YAxis {...axisProps} unit=" kWh" width={64} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="energy" name="kWh" stroke="#a78bfa" fill="#a78bfa33" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel
          title="Estimated monthly energy"
          subtitle={`About ${fmt(yearly, 0)} kWh per year with this layout (30-day months)`}
        >
          <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
            {monthly.map((m) => {
              const max = Math.max(...monthly.map((x) => x.kwh), 1);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1">
                  <div className="flex h-28 w-full items-end rounded-lg bg-white/5 p-1">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-cyan-500 to-fuchsia-400"
                      style={{ height: `${(m.kwh / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.month}</span>
                  <span className="text-[10px] font-mono">{Math.round(m.kwh)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
