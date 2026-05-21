import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceDot, CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Sun, Thermometer, Sliders, Zap, Gauge, Activity, TrendingUp,
  Plus, Trash2, FileDown, FileText, Maximize2, Minimize2, Layers, GitBranch, Hash,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { Meter } from "@/components/Meter";
import { CircuitBuilder } from "@/components/CircuitBuilder";
import { computeCell, operatingPoint, type Combination } from "@/lib/physics";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Simulation — Photon Lab" },
      { name: "description", content: "Interactive solar cell simulation: I-V, P-V and resistance vs power graphs." },
      { property: "og:title", content: "Solar Cell Simulation — Photon Lab" },
      { property: "og:description", content: "Determine fill factor, efficiency and maximum power resistance." },
    ],
  }),
  component: Lab,
});

interface Reading { id: number; R: number; V: number; I: number; P: number; }

function fmt(n: number, d = 3) { return Number.isFinite(n) ? n.toFixed(d) : "—"; }

function Lab() {
  const [mode, setMode] = useState<Combination | null>(null);
  const [stage, setStage] = useState<"mode" | "build" | "sim">("mode");
  const [cells, setCells] = useState(4);
  const [intensity, setIntensity] = useState(1000);
  const [temperature, setTemperature] = useState(25);
  const [Rload, setRload] = useState(15);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  const activeMode: Combination = mode ?? "single";
  const cell = useMemo(
    () => computeCell({ intensity, temperature, cells, mode: activeMode }),
    [intensity, temperature, cells, activeMode],
  );
  const op = useMemo(() => operatingPoint(cell.curve, Rload), [cell, Rload]);
  const rMax = activeMode === "series" ? 200 * cells : 200;
  useEffect(() => { if (Rload > rMax) setRload(rMax); }, [rMax, Rload]);

  // Chart datasets
  const ivData = cell.curve.map(p => ({ V: +p.V.toFixed(4), I: +(p.I * 1000).toFixed(4), P: +(p.P * 1000).toFixed(4) })); // I in mA, P in mW
  const pvData = ivData;
  const rpData = cell.curve
    .filter(p => Number.isFinite(p.R) && p.R > 0 && p.R < rMax)
    .map(p => ({ R: +p.R.toFixed(3), P: +(p.P * 1000).toFixed(4) }));

  const addReading = () => {
    setReadings(r => [...r, { id: Date.now(), R: Rload, V: op.V, I: op.I, P: op.P }]);
  };
  const clearReadings = () => setReadings([]);

  const exportCSV = () => {
    const rows = [["#", "R (Ω)", "V (V)", "I (mA)", "P (mW)"], ...readings.map((r, i) =>
      [i + 1, r.R.toFixed(2), r.V.toFixed(4), (r.I * 1000).toFixed(4), (r.P * 1000).toFixed(4)])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "solar-cell-readings.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Solar Cell — Observation Table", 14, 18);
    doc.setFontSize(10);
    doc.text(`Light Intensity: ${intensity} W/m²   Temperature: ${temperature} °C`, 14, 26);
    doc.text(`Voc: ${cell.Voc.toFixed(3)} V   Isc: ${(cell.Isc*1000).toFixed(3)} mA   Pmax: ${(cell.Pmax*1000).toFixed(3)} mW`, 14, 32);
    doc.text(`Vmp: ${cell.Vmp.toFixed(3)} V   Imp: ${(cell.Imp*1000).toFixed(3)} mA   Rmp: ${cell.Rmp.toFixed(2)} Ω`, 14, 38);
    doc.text(`Fill Factor: ${cell.FF.toFixed(3)}   Efficiency: ${cell.efficiency.toFixed(2)} %`, 14, 44);
    autoTable(doc, {
      startY: 50,
      head: [["#", "R (Ω)", "V (V)", "I (mA)", "P (mW)"]],
      body: readings.map((r, i) => [i + 1, r.R.toFixed(2), r.V.toFixed(4), (r.I * 1000).toFixed(4), (r.P * 1000).toFixed(4)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [34, 211, 238] },
    });
    doc.save("solar-cell-report.pdf");
  };

  return (
    <div className={`relative min-h-screen ${fullscreen ? "p-0" : ""}`}>
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <Particles count={20} />
      {!fullscreen && <Navbar />}

      <main className={`relative max-w-7xl mx-auto px-4 md:px-6 ${fullscreen ? "pt-6" : "pt-32"} pb-20`}>
        <AnimatePresence>
          {stage === "mode" && <ModeChooser onPick={(m, n) => { setMode(m); setCells(n); setStage("build"); }} />}
        </AnimatePresence>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Experiment</div>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">Solar Cell Simulation</h1>
            {mode && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-md glass inline-flex items-center gap-1.5">
                  {mode === "series" ? <GitBranch className="w-3 h-3 text-[var(--neon-cyan)]"/> : mode === "parallel" ? <Layers className="w-3 h-3 text-[var(--neon-purple)]"/> : <Sun className="w-3 h-3"/>}
                  <span className="capitalize">{mode}</span>
                  {mode !== "single" && <span className="text-muted-foreground">· {cells} cells</span>}
                </span>
                <button onClick={() => { setMode(null); setStage("mode"); }} className="text-muted-foreground hover:text-[var(--neon-cyan)] underline-offset-2 hover:underline">change</button>
                {stage === "sim" && (
                  <button onClick={() => setStage("build")} className="text-muted-foreground hover:text-[var(--neon-purple)] underline-offset-2 hover:underline">rebuild circuit</button>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setFullscreen(f => !f)} className="glass rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 hover:text-[var(--neon-cyan)]">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5"/> : <Maximize2 className="w-3.5 h-3.5"/>}
            {fullscreen ? "Exit" : "Fullscreen"} Lab
          </button>
        </div>

        {/* Stage 02 — Circuit builder */}
        {stage === "build" && mode && (
          <CircuitBuilder mode={mode} cells={cells} onSuccess={() => setStage("sim")} />
        )}

        {/* Stage 03 — Live simulation */}
        {stage === "sim" && <>
        {/* Live meters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <Meter label="Voltage" value={fmt(op.V, 3)} unit="V" icon={Zap} accent="cyan" />
          <Meter label="Current" value={fmt(op.I * 1000, 3)} unit="mA" icon={Activity} accent="blue" />
          <Meter label="Power" value={fmt(op.P * 1000, 3)} unit="mW" icon={TrendingUp} accent="purple" />
          <Meter label="Pmax" value={fmt(cell.Pmax * 1000, 3)} unit="mW" icon={Gauge} accent="pink" />
          <Meter label="R @ Pmax" value={fmt(cell.Rmp, 2)} unit="Ω" icon={Sliders} accent="cyan" />
          <Meter label="Fill Factor" value={fmt(cell.FF, 3)} icon={Gauge} accent="purple" hint={`Voc=${fmt(cell.Voc,3)}V`} />
          <Meter label="Efficiency" value={fmt(cell.efficiency, 2)} unit="%" icon={Sun} accent="pink" hint={`Pin=${fmt(cell.Pin*1000,2)} mW`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Controls */}
          <motion.div layout className="glass-strong rounded-2xl p-5 lg:col-span-1 gradient-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Sliders className="w-4 h-4 text-[var(--neon-cyan)]" /> Controls</h3>

            {mode && mode !== "single" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/>Combination Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["series","parallel"] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`text-xs px-2 py-1.5 rounded-lg border transition ${mode===m ? "border-[var(--neon-cyan)] bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] text-[var(--neon-cyan)]" : "border-border/50 glass text-muted-foreground hover:text-foreground"}`}>
                      {m === "series" ? "Series" : "Parallel"}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Slider icon={<Layers className="w-3.5 h-3.5"/>} label="Number of Cells" value={cells} min={1} max={12} step={1} unit="" onChange={(v)=>setCells(Math.round(v))} accent="purple" />
                </div>
              </div>
            )}

            <Slider icon={<Sliders className="w-3.5 h-3.5"/>} label="Load Resistance" value={Rload} min={1} max={rMax} step={0.5} unit="Ω" onChange={setRload} accent="cyan" />
            <Slider icon={<Sun className="w-3.5 h-3.5"/>} label="Light Intensity" value={intensity} min={200} max={1500} step={10} unit="W/m²" onChange={setIntensity} accent="purple" />
            <Slider icon={<Thermometer className="w-3.5 h-3.5"/>} label="Temperature" value={temperature} min={0} max={75} step={1} unit="°C" onChange={setTemperature} accent="pink" />

            <div className="mt-5 p-3 rounded-xl glass">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Reference at MPP</div>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Vmp</span><span className="text-right tabular-nums">{fmt(cell.Vmp,3)} V</span>
                <span className="text-muted-foreground">Imp</span><span className="text-right tabular-nums">{fmt(cell.Imp*1000,3)} mA</span>
                <span className="text-muted-foreground">Voc</span><span className="text-right tabular-nums">{fmt(cell.Voc,3)} V</span>
                <span className="text-muted-foreground">Isc</span><span className="text-right tabular-nums">{fmt(cell.Isc*1000,3)} mA</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={addReading} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--primary-foreground)] text-sm font-medium hover:scale-[1.02] transition">
                <Plus className="w-4 h-4"/> Add Reading
              </button>
              <button onClick={clearReadings} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg glass text-sm hover:text-destructive">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="lg:col-span-2 grid gap-5">
            <ChartCard title="I–V Characteristic" subtitle="Current vs Voltage">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ivData}>
                  <defs>
                    <linearGradient id="ivg" x1="0" x2="1"><stop offset="0%" stopColor="oklch(0.85 0.18 200)"/><stop offset="100%" stopColor="oklch(0.65 0.25 300)"/></linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="V" stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={v=>v.toFixed(2)} label={{ value: "V (V)", position: "insideBottom", offset: -2, fill: "#888", fontSize: 11 }}/>
                  <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} label={{ value: "I (mA)", angle: -90, position: "insideLeft", fill: "#888", fontSize: 11 }}/>
                  <Tooltip content={<ChartTip suffixes={{V:" V", I:" mA"}} />} />
                  <Line type="monotone" dataKey="I" stroke="url(#ivg)" strokeWidth={2.5} dot={false} isAnimationActive={false} style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}/>
                  <ReferenceDot x={+cell.Vmp.toFixed(4)} y={+(cell.Imp*1000).toFixed(4)} r={6} fill="var(--neon-pink)" stroke="white" />
                  <ReferenceDot x={+op.V.toFixed(4)} y={+(op.I*1000).toFixed(4)} r={5} fill="var(--neon-cyan)" stroke="white" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="P–V Characteristic" subtitle="Power vs Voltage · MPP highlighted">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={pvData}>
                  <defs>
                    <linearGradient id="pvg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.25 300)" stopOpacity={0.6}/>
                      <stop offset="100%" stopColor="oklch(0.65 0.25 300)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="V" stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={v=>v.toFixed(2)} />
                  <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} label={{ value: "P (mW)", angle:-90, position:"insideLeft", fill:"#888", fontSize:11 }}/>
                  <Tooltip content={<ChartTip suffixes={{V:" V", P:" mW"}} />} />
                  <Area type="monotone" dataKey="P" stroke="var(--neon-purple)" strokeWidth={2.5} fill="url(#pvg)" isAnimationActive={false} style={{ filter: "drop-shadow(0 0 6px var(--neon-purple))" }}/>
                  <ReferenceDot x={+cell.Vmp.toFixed(4)} y={+(cell.Pmax*1000).toFixed(4)} r={6} fill="var(--neon-pink)" stroke="white" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Resistance vs Power" subtitle="Power as a function of load R">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rpData}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="R" stroke="oklch(0.7 0.03 255)" fontSize={11} type="number" scale="log" domain={['auto','auto']} label={{ value:"R (Ω) [log]", position:"insideBottom", offset:-2, fill:"#888", fontSize:11 }}/>
                  <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} label={{ value:"P (mW)", angle:-90, position:"insideLeft", fill:"#888", fontSize:11 }}/>
                  <Tooltip content={<ChartTip suffixes={{R:" Ω", P:" mW"}} />} />
                  <Line type="monotone" dataKey="P" stroke="var(--neon-cyan)" strokeWidth={2.5} dot={false} isAnimationActive={false} style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}/>
                  <ReferenceDot x={+cell.Rmp.toFixed(3)} y={+(cell.Pmax*1000).toFixed(4)} r={6} fill="var(--neon-pink)" stroke="white" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Observation table */}
        <motion.div layout className="glass-strong rounded-2xl p-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-[var(--neon-cyan)]"/> Observation Table</h3>
            <div className="flex gap-2">
              <button onClick={exportCSV} disabled={!readings.length} className="text-xs px-3 py-1.5 rounded-lg glass hover:text-[var(--neon-cyan)] disabled:opacity-40 inline-flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5"/> CSV</button>
              <button onClick={exportPDF} disabled={!readings.length} className="text-xs px-3 py-1.5 rounded-lg glass hover:text-[var(--neon-purple)] disabled:opacity-40 inline-flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5"/> PDF</button>
            </div>
          </div>
          <div className="overflow-auto rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-[color-mix(in_oklab,var(--neon-cyan)_8%,transparent)] text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-right">R (Ω)</th>
                  <th className="px-3 py-2 text-right">V (V)</th>
                  <th className="px-3 py-2 text-right">I (mA)</th>
                  <th className="px-3 py-2 text-right">P (mW)</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {readings.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No readings yet — adjust the load and click "Add Reading".</td></tr>
                  )}
                  {readings.map((r, i) => (
                    <motion.tr key={r.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="border-t border-border/40 tabular-nums">
                      <td className="px-3 py-2">{i+1}</td>
                      <td className="px-3 py-2 text-right">{r.R.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{r.V.toFixed(4)}</td>
                      <td className="px-3 py-2 text-right">{(r.I*1000).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-[var(--neon-cyan)]">{(r.P*1000).toFixed(4)}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
        </>}
      </main>
      {!fullscreen && <Footer />}
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange, accent = "cyan", icon }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void; accent?: "cyan"|"purple"|"pink"; icon?: React.ReactNode;
}) {
  const colors = { cyan: "var(--neon-cyan)", purple: "var(--neon-purple)", pink: "var(--neon-pink)" };
  const c = colors[accent];
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">{icon}{label}</span>
        <span className="text-sm tabular-nums font-medium" style={{ color: c, textShadow: `0 0 10px ${c}` }}>{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${c} 0%, ${c} ${pct}%, oklch(1 0 0 / 0.1) ${pct}%, oklch(1 0 0 / 0.1) 100%)`,
          boxShadow: `0 0 12px color-mix(in oklab, ${c} 40%, transparent)`
        }}
      />
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} className="glass-strong rounded-2xl p-4 gradient-border">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold tracking-wide">{title}</h4>
        {subtitle && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </motion.div>
  );
}

function ChartTip({ active, payload, label, suffixes }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tabular-nums" style={{ color: p.color || "var(--neon-cyan)" }}>
          {p.dataKey}: {Number(p.value).toFixed(3)}{suffixes?.[p.dataKey] || ""}
        </div>
      ))}
    </div>
  );
}

function ModeChooser({ onPick }: { onPick: (m: Combination, n: number) => void }) {
  const [picked, setPicked] = useState<Combination | null>(null);
  const [count, setCount] = useState(2);
  const opts: { id: Combination; title: string; icon: any; color: string; lines: string[] }[] = [
    { id: "series", title: "Series Combination", icon: GitBranch, color: "var(--neon-cyan)",
      lines: ["V_total = V₁ + V₂ + …", "I_total = constant", "↑ Voltage · same Current"] },
    { id: "parallel", title: "Parallel Combination", icon: Layers, color: "var(--neon-purple)",
      lines: ["I_total = I₁ + I₂ + …", "V_total = constant", "↑ Current · same Voltage"] },
  ];
  const accent = picked === "parallel" ? "var(--neon-purple)" : "var(--neon-cyan)";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 grid place-items-center p-4 backdrop-blur-md bg-background/70"
    >
      <motion.div initial={{ y: 20, scale: 0.96 }} animate={{ y: 0, scale: 1 }}
        className="glass-strong rounded-3xl p-6 md:p-8 max-w-2xl w-full gradient-border">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Step 01</div>
        <h2 className="text-2xl md:text-3xl font-bold gradient-text mt-1">
          {picked ? "How many solar cells?" : "Choose Cell Combination"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {picked
            ? "Set the number of cells to wire on the workspace. Min 1, max 12."
            : "Pick how the solar cells are wired. The simulation behavior, formulas and graphs will adapt in real time."}
        </p>

        {!picked && (
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {opts.map(o => (
              <motion.button key={o.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                onClick={() => setPicked(o.id)}
                className="text-left glass rounded-2xl p-5 border border-border/40 hover:border-[color:var(--neon-cyan)] transition group">
                <div className="flex items-center gap-2 mb-2">
                  <o.icon className="w-5 h-5" style={{ color: o.color }} />
                  <h3 className="font-semibold">{o.title}</h3>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {o.lines.map(l => <li key={l} className="font-mono">{l}</li>)}
                </ul>
                <div className="mt-3 text-[11px] uppercase tracking-widest" style={{ color: o.color }}>Choose →</div>
              </motion.button>
            ))}
          </div>
        )}

        {picked && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="flex items-center justify-center gap-5">
              <button onClick={() => setCount(c => Math.max(1, c - 1))}
                className="w-12 h-12 rounded-full glass grid place-items-center text-2xl hover:scale-110 transition"
                style={{ boxShadow: `0 0 14px color-mix(in oklab,${accent} 40%,transparent)` }}>−</button>
              <motion.div key={count} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="tabular-nums text-6xl font-bold"
                style={{ color: accent, textShadow: `0 0 24px ${accent}` }}>{count}</motion.div>
              <button onClick={() => setCount(c => Math.min(12, c + 1))}
                className="w-12 h-12 rounded-full glass grid place-items-center text-2xl hover:scale-110 transition"
                style={{ boxShadow: `0 0 14px color-mix(in oklab,${accent} 40%,transparent)` }}>+</button>
            </div>
            <input type="range" min={1} max={12} step={1} value={count}
              onChange={e => setCount(parseInt(e.target.value))}
              className="w-full mt-5 h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right,${accent} 0%,${accent} ${((count-1)/11)*100}%,oklch(1 0 0 / 0.1) ${((count-1)/11)*100}%,oklch(1 0 0 / 0.1) 100%)`,
                boxShadow: `0 0 12px color-mix(in oklab,${accent} 40%,transparent)`,
              }} />
            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setPicked(null)} className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">← back</button>
              <button onClick={() => onPick(picked, count)}
                className="px-5 py-2 rounded-xl font-medium text-[var(--primary-foreground)]"
                style={{ background: `linear-gradient(135deg,${accent},var(--neon-purple))`,
                         boxShadow: `0 0 22px color-mix(in oklab,${accent} 55%,transparent)` }}>
                Enter Workspace →
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
