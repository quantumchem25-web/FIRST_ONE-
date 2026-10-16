import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Gauge, Snowflake } from "lucide-react";
import { DEFAULT_CELL, fmt, sweepCell, temperatureSweep } from "@/lib/solarModel";
import { Insight, Panel, Slider, StatCard, axisProps, chartTooltipStyle } from "./ui";

export function TemperaturePanel() {
  const [irradiance, setIrradiance] = useState(1000);
  const [temp, setTemp] = useState(45);

  const sweep = useMemo(() => temperatureSweep(irradiance, 0, 85, 5), [irradiance]);
  const ref = useMemo(() => sweepCell(DEFAULT_CELL, irradiance, 25, 120), [irradiance]);
  const now = useMemo(() => sweepCell(DEFAULT_CELL, irradiance, temp, 120), [irradiance, temp]);

  const powerChange = ref.pmax > 0 ? ((now.pmax - ref.pmax) / ref.pmax) * 100 : 0;
  const perDegree = useMemo(() => {
    const a = sweep[0];
    const b = sweep[sweep.length - 1];
    return ((b.pmax - a.pmax) / a.pmax / (b.temp - a.temp)) * 100;
  }, [sweep]);

  const curves = useMemo(
    () =>
      [0, 25, 50, 75].map((t) => ({
        t,
        data: sweepCell(DEFAULT_CELL, irradiance, t, 80).curve.map((p) => ({
          V: Number(p.V.toFixed(3)),
          I: Number(p.I.toFixed(3)),
        })),
      })),
    [irradiance],
  );

  const colors: Record<number, string> = { 0: "#38bdf8", 25: "#22d3ee", 50: "#facc15", 75: "#f472b6" };

  const table = sweep.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="Heat study" subtitle="See why solar panels like cold, sunny days">
        <div className="space-y-4">
          <Slider label="Cell temperature" value={temp} min={0} max={85} unit="°C" onChange={setTemp} />
          <Slider label="Sunlight" value={irradiance} min={200} max={1200} step={50} unit="W/m²" onChange={setIrradiance} />
          <div className="rounded-xl glass p-3 text-xs leading-relaxed text-muted-foreground">
            <b className="text-foreground">Why it happens:</b> heat makes electrons in the junction jump across more easily.
            That raises the dark current, so the open-circuit voltage <i>falls</i> about 2.3 mV per cell per °C. Current
            rises only a tiny bit, so power drops overall.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[15, 25, 45, 70].map((t) => (
              <button
                key={t}
                onClick={() => setTemp(t)}
                className="glass rounded-xl py-2 text-xs transition hover:bg-white/5"
              >
                Set {t}°C
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Voc" value={fmt(now.voc, 3)} unit="V" icon={<Gauge className="h-4 w-4" />} />
          <StatCard label="Pmax" value={fmt(now.pmax, 2)} unit="W" hint={`${powerChange >= 0 ? "+" : ""}${fmt(powerChange, 1)}% vs 25°C`} icon={temp > 25 ? <Flame className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />} />
          <StatCard label="Efficiency" value={fmt(now.efficiency, 2)} unit="%" />
          <StatCard label="Fill factor" value={fmt(now.fillFactor, 3)} />
        </div>

        {powerChange < -8 ? (
          <Insight tone="warn">
            At {temp}°C this cell makes {fmt(Math.abs(powerChange), 1)}% less power than at 25°C. On a hot roof, extra
            airflow behind the panel can win some of this back.
          </Insight>
        ) : powerChange > 2 ? (
          <Insight tone="good">Cold cells are happy cells: you gain {fmt(powerChange, 1)}% power compared with 25°C.</Insight>
        ) : (
          <Insight>Close to standard test condition (25°C). Slide the temperature to see the change.</Insight>
        )}

        <Panel
          title="Open-circuit voltage and power vs temperature"
          subtitle={`Power falls about ${fmt(Math.abs(perDegree), 2)}% for every °C of heating`}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sweep}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="temp" {...axisProps} unit="°" />
                <YAxis yAxisId="v" {...axisProps} width={48} domain={["auto", "auto"]} />
                <YAxis yAxisId="p" orientation="right" {...axisProps} width={42} domain={["auto", "auto"]} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => v.toFixed(3)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="v" x={temp} stroke="#facc15" strokeDasharray="4 4" />
                <Line yAxisId="v" type="monotone" dataKey="voc" name="Voc (V)" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                <Line yAxisId="p" type="monotone" dataKey="pmax" name="Pmax (W)" stroke="#f472b6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="I-V curves at four temperatures">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" dataKey="V" domain={[0, 0.8]} {...axisProps} unit=" V" />
                <YAxis type="number" dataKey="I" {...axisProps} unit=" A" width={52} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {curves.map((c) => (
                  <Line
                    key={c.t}
                    data={c.data}
                    dataKey="I"
                    name={`${c.t}°C`}
                    stroke={colors[c.t]}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Data table" subtitle="Values for a single 156 mm silicon cell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-4">T (°C)</th>
                  <th className="pr-4">Voc (V)</th>
                  <th className="pr-4">Isc (A)</th>
                  <th className="pr-4">Pmax (W)</th>
                  <th className="pr-4">η (%)</th>
                  <th>FF</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {table.map((r) => (
                  <tr key={r.temp} className="border-t border-white/10">
                    <td className="py-1.5 pr-4">{r.temp}</td>
                    <td className="pr-4">{fmt(r.voc, 3)}</td>
                    <td className="pr-4">{fmt(r.isc, 2)}</td>
                    <td className="pr-4">{fmt(r.pmax, 3)}</td>
                    <td className="pr-4">{fmt(r.efficiency, 2)}</td>
                    <td>{fmt(r.fillFactor, 3)}</td>
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
