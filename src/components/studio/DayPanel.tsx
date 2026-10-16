import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import { Sunrise } from "lucide-react";
import {
  dayYield, SEASONS, fmt, fmtHour, toCSV, downloadText,
} from "@/lib/studio";
import { AXIS, GRID, COLORS, ChartTip, ExportButton, InfoNote, LabeledSlider, Panel, Segmented, Stat } from "./ui";

export function DayPanel() {
  const [seasonId, setSeasonId] = useState("summer");
  const [panels, setPanels] = useState(10);
  const [cells, setCells] = useState(36);
  const [noct, setNoct] = useState(45);
  const [Rs, setRs] = useState(0.1);
  const [soiling, setSoiling] = useState(0.05);
  const [seed, setSeed] = useState(7);

  const season = SEASONS.find((s) => s.id === seasonId) ?? SEASONS[0];

  const result = useMemo(
    () => dayYield({ season, cells, panels, area: 4, noct, Rs, seed, soiling }),
    [season, cells, panels, noct, Rs, seed, soiling],
  );

  const all = useMemo(
    () =>
      SEASONS.map((s) => ({
        name: s.label,
        kWh: +(dayYield({ season: s, cells, panels, area: 4, noct, Rs, seed, soiling }).energyWh / 1000).toFixed(3),
      })),
    [cells, panels, noct, Rs, seed, soiling],
  );

  const data = result.rows
    .filter((r) => r.hour >= 4 && r.hour <= 21)
    .map((r) => ({
      hour: r.hour,
      power: +r.power.toFixed(3),
      G: Math.round(r.G),
      Tcell: +r.cellTemp.toFixed(1),
    }));

  const exportCsv = () => {
    const headers = ["hour", "G (W/m2)", "ambient (C)", "cell temp (C)", "array power (W)", "efficiency (%)"];
    const body = result.rows.map((r) => [fmtHour(r.hour), Math.round(r.G), fmt(r.ambient, 1), fmt(r.cellTemp, 1), fmt(r.power, 3), fmt(r.efficiency, 2)]);
    downloadText(`photon-day-${seasonId}.csv`, toCSV(headers, body));
  };

  const best = all.reduce((a, b) => (b.kWh > a.kWh ? b : a), all[0]);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      <Panel title="Array & weather" icon={<Sunrise className="w-4 h-4 text-[var(--neon-cyan)]" />}>
        <div className="space-y-5">
          <Segmented
            label="Season"
            value={seasonId}
            onChange={setSeasonId}
            options={SEASONS.map((s) => ({ id: s.id, label: s.label }))}
          />
          <div className="text-[11px] text-muted-foreground">
            Sunrise {fmtHour(season.sunrise)} · sunset {fmtHour(season.sunset)} · peak {season.peakG} W/m² · {season.tMin}–{season.tMax} °C
          </div>
          <LabeledSlider label="Panels in the array" min={1} max={40} value={panels} onChange={(v) => setPanels(Math.round(v))} />
          <LabeledSlider label="Cells per panel (series)" min={6} max={72} step={6} value={cells} onChange={(v) => setCells(Math.round(v))} />
          <LabeledSlider label="NOCT" unit="°C" min={40} max={55} value={noct} onChange={setNoct}
            hint="Nominal operating cell temperature: how hot the cells run above the air." />
          <LabeledSlider label="Series resistance" unit="Ω" min={0} max={0.5} step={0.05} digits={2} value={Rs} onChange={setRs} />
          <LabeledSlider label="Dust and soiling loss" unit="%" min={0} max={30} value={Math.round(soiling * 100)} onChange={(v) => setSoiling(v / 100)} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSeed((s) => s + 1)} className="text-xs px-3 py-1.5 rounded-lg glass hover:text-[var(--neon-cyan)] transition">
              🎲 New cloud pattern
            </button>
            <ExportButton onClick={exportCsv} label="CSV" />
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Array power through the day">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="dayg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.85 0.18 200)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.85 0.18 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} />
              <XAxis dataKey="hour" stroke={AXIS} fontSize={11} tickFormatter={(h) => fmtHour(Number(h))} interval={7} />
              <YAxis yAxisId="p" stroke={AXIS} fontSize={11} />
              <YAxis yAxisId="g" orientation="right" stroke={AXIS} fontSize={11} />
              <Tooltip content={<ChartTip labelFormatter={(l) => fmtHour(Number(l))} valueFormatter={(v, k) => (k === "power" ? `${v.toFixed(2)} W` : k === "G" ? `${v} W/m²` : `${v} °C`)} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="p" type="monotone" dataKey="power" name="Power" stroke={COLORS.cyan} fill="url(#dayg)" strokeWidth={2.4} isAnimationActive={false} />
              <Line yAxisId="g" type="monotone" dataKey="G" name="Irradiance" stroke={COLORS.pink} strokeDasharray="4 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              <Line yAxisId="g" type="monotone" dataKey="Tcell" name="Cell temp" stroke={COLORS.purple} strokeWidth={1.6} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Daily summary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Energy" value={fmt(result.energyWh, 1)} unit="Wh" tone="cyan" sub={`${fmt(result.energyWh / 1000, 3)} kWh`} />
            <Stat label="Peak power" value={fmt(result.peakPower, 1)} unit="W" tone="purple" sub={`at ${fmtHour(result.peakHour)}`} />
            <Stat label="Peak-sun hours" value={fmt(result.sunHours, 2)} unit="h" tone="pink" />
            <Stat label="Capacity factor" value={fmt(result.capacityFactor, 1)} unit="%" tone="plain" />
            <Stat label="Avg. efficiency" value={fmt(result.avgEfficiency, 2)} unit="%" tone="cyan" />
            <Stat label="Array voltage (Vmp)" value={fmt(cells * 0.5, 1)} unit="V" tone="plain" sub="rough, per panel" />
            <Stat label="Panels" value={String(panels)} tone="plain" />
            <Stat label="Soiling" value={`${Math.round(soiling * 100)}`} unit="%" tone="pink" />
          </div>
        </Panel>

        <Panel title="Same array across the seasons">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={all} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" stroke={AXIS} fontSize={11} />
              <YAxis stroke={AXIS} fontSize={11} />
              <Tooltip content={<ChartTip valueFormatter={(v) => `${v.toFixed(2)} kWh`} />} />
              <Bar dataKey="kWh" name="Energy per day" fill="oklch(0.65 0.25 300)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <InfoNote>
              {best.name} gives the most energy for this array ({fmt(best.kWh, 2)} kWh a day). Longer days and clearer skies beat the small
              efficiency loss from hot cells. Try raising the soiling slider to see how cleaning panels pays off.
            </InfoNote>
          </div>
        </Panel>
      </div>
    </div>
  );
}
