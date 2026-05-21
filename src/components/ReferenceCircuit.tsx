import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, GitBranch, Layers } from "lucide-react";

type Mode = "series" | "parallel";

interface Props { mode: Mode; cells?: number; }

const VW = 1000;
const VH = 520;

function seriesPath(n: number) {
  const yRow = 230;
  const xStart = 200, xEnd = 600;
  const step = n === 1 ? 0 : (xEnd - xStart) / (n - 1);
  let d = `M 80 80 L 80 ${yRow} L ${xStart} ${yRow}`;
  for (let i = 1; i < n; i++) d += ` L ${xStart + i * step} ${yRow}`;
  d += ` L 720 ${yRow} L 820 ${yRow} L 920 ${yRow}`;
  d += ` L 920 430 L ${xStart} 430 L ${xStart} ${yRow}`;
  return d;
}
function parallelPath(n: number) {
  const xCell = 280;
  const yTop = n === 1 ? 230 : 120;
  const yBot = n === 1 ? 230 : 380;
  let d = `M 80 80 L 80 ${yTop} L ${xCell} ${yTop} L ${xCell} ${yBot}`;
  // junction trunk
  d += ` M ${xCell} 230 L 480 230 L 620 230 L 760 230 L 880 230`;
  d += ` L 880 460 L ${xCell} 460 L ${xCell} ${yBot}`;
  // branches
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 230 : yTop + ((yBot - yTop) * i) / (n - 1);
    d += ` M ${xCell} ${y} L 480 ${y} L 480 230`;
  }
  return d;
}

function CellGlyph({ x, y, label }: { x: number; y: number; label?: string }) {
  // Solar-cell glyph: blue square with grid lines + sun ray
  return (
    <g transform={`translate(${x - 28},${y - 18})`}>
      <rect width="56" height="36" rx="4" fill="oklch(0.25 0.07 250)"
        stroke="var(--neon-cyan)" strokeWidth="1.5"
        style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }} />
      {[10, 20, 30, 40].map(gx => (
        <line key={gx} x1={gx} y1="2" x2={gx} y2="34" stroke="var(--neon-cyan)" strokeOpacity="0.45" strokeWidth="0.7" />
      ))}
      <line x1="0" y1="18" x2="56" y2="18" stroke="var(--neon-cyan)" strokeOpacity="0.4" strokeWidth="0.7" />
      {label && <text x="28" y="52" textAnchor="middle" fontSize="11" fill="oklch(0.7 0.03 255)">{label}</text>}
    </g>
  );
}

function MeterGlyph({ x, y, letter, color, label }: { x: number; y: number; letter: "A" | "V"; color: string; label: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="22" fill="oklch(0.13 0.03 265)" stroke={color} strokeWidth="1.8"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      <text textAnchor="middle" dy="6" fontSize="20" fontWeight="700" fill={color}>{letter}</text>
      <text textAnchor="middle" y="42" fontSize="11" fill="oklch(0.7 0.03 255)">{label}</text>
    </g>
  );
}

function RheostatGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 36},${y - 12})`}>
      <rect width="72" height="24" rx="3" fill="oklch(0.13 0.03 265)" stroke="var(--neon-pink)" strokeWidth="1.6"
        style={{ filter: "drop-shadow(0 0 6px var(--neon-pink))" }} />
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1={8 + i*12} y1="4" x2={8 + i*12} y2="20" stroke="var(--neon-pink)" strokeOpacity="0.6" strokeWidth="1"/>
      ))}
      <line x1="36" y1="-8" x2="44" y2="4" stroke="var(--neon-pink)" strokeWidth="1.5"/>
      <text x="36" y="44" textAnchor="middle" fontSize="11" fill="oklch(0.7 0.03 255)">Rheostat (R)</text>
    </g>
  );
}

function SwitchGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 22},${y})`}>
      <circle cx="0"  cy="0" r="3" fill="var(--neon-cyan)" />
      <circle cx="44" cy="0" r="3" fill="var(--neon-cyan)" />
      <line x1="0" y1="0" x2="38" y2="-12" stroke="var(--neon-cyan)" strokeWidth="2"
        style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }} />
      <text x="22" y="22" textAnchor="middle" fontSize="11" fill="oklch(0.7 0.03 255)">Switch (K)</text>
    </g>
  );
}

function SunGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="14" fill="oklch(0.85 0.18 90)" style={{ filter: "drop-shadow(0 0 10px oklch(0.85 0.18 90))" }} />
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 10;
        const x1 = Math.cos(a) * 18, y1 = Math.sin(a) * 18;
        const x2 = Math.cos(a) * 26, y2 = Math.sin(a) * 26;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.85 0.18 90)" strokeWidth="2" />;
      })}
      <text y="50" textAnchor="middle" fontSize="11" fill="oklch(0.7 0.03 255)">Light Source</text>
    </g>
  );
}

function CircuitSVG({ mode, cells = 3 }: Props) {
  const path = mode === "series" ? seriesPath(cells) : parallelPath(cells);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
      <defs>
        <path id={`flow-${mode}`} d={path} />
        <linearGradient id="wireGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--neon-cyan)" />
          <stop offset="100%" stopColor="var(--neon-purple)" />
        </linearGradient>
        <pattern id="grid-ref" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--neon-cyan)" strokeOpacity="0.06" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width={VW} height={VH} fill="url(#grid-ref)" />

      {/* Wires */}
      <path d={path} fill="none" stroke="url(#wireGrad)" strokeWidth="2.5"
        style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }} />

      {/* Sun */}
      <SunGlyph x={80} y={50} />

      {/* Cells */}
      {mode === "series"
        ? Array.from({ length: cells }).map((_, i) => {
            const xStart = 200, xEnd = 600;
            const step = cells === 1 ? 0 : (xEnd - xStart) / (cells - 1);
            return <CellGlyph key={i} x={xStart + i * step} y={230} label={`Cell ${i + 1}`} />;
          })
        : Array.from({ length: cells }).map((_, i) => {
            const yTop = cells === 1 ? 230 : 120, yBot = cells === 1 ? 230 : 380;
            const y = cells === 1 ? 230 : yTop + ((yBot - yTop) * i) / (cells - 1);
            return <CellGlyph key={i} x={280} y={y} label={`Cell ${i + 1}`} />;
          })}

      {/* Voltmeter — across cells (parallel branch) */}
      {mode === "series" ? (
        <>
          <path d={`M 200 ${430} L 200 ${480} L 400 ${480} L 400 ${430}`} fill="none"
            stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3" />
          <MeterGlyph x={300} y={480} letter="V" color="var(--neon-purple)" label="Voltmeter (parallel)" />
        </>
      ) : (
        <>
          <path d={`M 280 460 L 280 500 L 480 500 L 480 230`} fill="none"
            stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3" opacity="0" />
          <MeterGlyph x={180} y={460} letter="V" color="var(--neon-purple)" label="Voltmeter (parallel)" />
          <line x1="180" y1="438" x2="180" y2="380" stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3"/>
          <line x1="180" y1="380" x2="252" y2="380" stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3"/>
          <line x1="180" y1="482" x2="180" y2="500" stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3"/>
          <line x1="180" y1="500" x2="252" y2="500" stroke="var(--neon-purple)" strokeWidth="2" strokeDasharray="4 3"/>
          <line x1="252" y1="500" x2="252" y2="380" stroke="var(--neon-purple)" strokeWidth="0" />
        </>
      )}

      {/* Ammeter — in series */}
      <MeterGlyph
        x={mode === "series" ? 720 : 620}
        y={230}
        letter="A"
        color="var(--neon-blue)"
        label="Ammeter (series)"
      />
      <RheostatGlyph x={mode === "series" ? 820 : 760} y={230} />
      <SwitchGlyph x={mode === "series" ? 920 : 880} y={230} />

      {/* Direction arrow */}
      <text x={mode === "series" ? 480 : 700} y={mode === "series" ? 215 : 215}
        fontSize="11" fill="var(--neon-cyan)" textAnchor="middle">
        ▶ conventional current
      </text>

      {/* Animated electrons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <circle key={i} r="3.2" fill="var(--neon-cyan)"
          style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}>
          <animateMotion dur="4.5s" repeatCount="indefinite" begin={`${i * 0.55}s`}>
            <mpath href={`#flow-${mode}`} />
          </animateMotion>
        </circle>
      ))}
    </svg>
  );
}

export function ReferenceCircuit({ mode, cells = 3 }: Props) {
  const [open, setOpen] = useState(false);
  const isSeries = mode === "series";
  const Icon = isSeries ? GitBranch : Layers;
  const accent = isSeries ? "var(--neon-cyan)" : "var(--neon-purple)";
  const formulas = isSeries
    ? ["V_total = V₁ + V₂ + … + Vₙ", "I_total = I₁ = I₂ = … (constant)", "R_total = R₁ + R₂ + … + Rₙ"]
    : ["I_total = I₁ + I₂ + … + Iₙ", "V_total = V₁ = V₂ = … (constant)", "1/R_total = 1/R₁ + 1/R₂ + …"];
  const desc = isSeries
    ? "Cells are wired end-to-end so the same current flows through every element. Voltages add up across the chain. The ammeter sits in series with the loop; the voltmeter is connected in parallel across the cells."
    : "Cells share common positive and negative buses, forming independent branches. Each branch contributes its own current to a common node, so total current adds up while voltage stays constant. The ammeter measures the combined current; the voltmeter is connected across the bus.";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        whileHover={{ y: -3 }}
        className="glass-strong rounded-2xl p-5 gradient-border relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }} />
            <h3 className="font-semibold">{isSeries ? "Series" : "Parallel"} Combination — Reference Circuit</h3>
          </div>
          <button onClick={() => setOpen(true)}
            className="text-xs glass rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 hover:text-[var(--neon-cyan)]">
            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
          </button>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="rounded-xl border border-border/40 bg-[radial-gradient(ellipse_at_center,oklch(0.13_0.03_265/0.85),oklch(0.08_0.02_260/0.95))] p-3 cursor-zoom-in"
          onClick={() => setOpen(true)}>
          <CircuitSVG mode={mode} cells={3} />
        </motion.div>

        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{desc}</p>
        <div className="font-mono text-sm mt-3 space-y-1">
          {formulas.map((f, i) => (
            <div key={f} className={i === 0 ? "neon-text" : "text-muted-foreground"}>{f}</div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-md bg-background/80"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              className="relative max-w-6xl w-full glass-strong rounded-3xl p-6 gradient-border"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full glass grid place-items-center hover:text-[var(--neon-pink)]">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: accent }} />
                <h3 className="font-semibold text-lg">
                  {isSeries ? "Series" : "Parallel"} Combination — Full Reference
                </h3>
              </div>
              <CircuitSVG mode={mode} cells={4} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
