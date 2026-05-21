import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Zap, Activity, Sliders, Power, Radio, Battery, Gauge, Waves, Circle,
  CheckCircle2, AlertTriangle, Sparkles, RotateCcw, Lightbulb, HelpCircle,
} from "lucide-react";
import type { Combination } from "@/lib/physics";

// -------------------- Apparatus catalogue --------------------
export type ApparatusId =
  | "solar" | "ammeter" | "voltmeter" | "rheostat" | "switch"
  | "light" | "battery" | "galvanometer" | "multimeter" | "junction" | "wire";

interface Apparatus { id: ApparatusId; label: string; icon: any; color: string; }

const CATALOGUE: Apparatus[] = [
  { id: "solar",        label: "Solar Cell",     icon: Sun,       color: "var(--neon-cyan)"   },
  { id: "ammeter",      label: "Ammeter",        icon: Activity,  color: "var(--neon-blue)"   },
  { id: "voltmeter",    label: "Voltmeter",      icon: Zap,       color: "var(--neon-purple)" },
  { id: "rheostat",     label: "Rheostat",       icon: Sliders,   color: "var(--neon-pink)"   },
  { id: "switch",       label: "Switch",         icon: Power,     color: "var(--neon-cyan)"   },
  { id: "light",        label: "Light Source",   icon: Lightbulb, color: "var(--neon-cyan)"   },
  { id: "battery",      label: "Battery",        icon: Battery,   color: "var(--neon-purple)" },
  { id: "galvanometer", label: "Galvanometer",   icon: Radio,     color: "var(--neon-blue)"   },
  { id: "multimeter",   label: "Multimeter",     icon: Gauge,     color: "var(--neon-pink)"   },
  { id: "junction",     label: "Junction Node",  icon: Circle,    color: "var(--neon-cyan)"   },
  { id: "wire",         label: "Connecting Wire",icon: Waves,     color: "var(--neon-blue)"   },
];
const byId = (id: ApparatusId) => CATALOGUE.find(a => a.id === id)!;

// -------------------- Slot definitions --------------------
interface SlotDef { id: string; x: number; y: number; accepts: ApparatusId; }

function buildSlots(mode: Combination, n: number): SlotDef[] {
  const slots: SlotDef[] = [];
  // Light source (top-left), always
  slots.push({ id: "src", x: 8, y: 14, accepts: "light" });

  if (mode === "parallel") {
    // N solar cells stacked vertically as parallel branches at x≈26%
    const yTop = 22, yBot = 78;
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 50 : yTop + ((yBot - yTop) * i) / (n - 1);
      slots.push({ id: `c${i}`, x: 26, y, accepts: "solar" });
    }
    slots.push({ id: "j",   x: 46, y: 50, accepts: "junction" });
    slots.push({ id: "amm", x: 60, y: 50, accepts: "ammeter" });
    slots.push({ id: "rh",  x: 74, y: 50, accepts: "rheostat" });
    slots.push({ id: "sw",  x: 88, y: 50, accepts: "switch" });
    slots.push({ id: "vm",  x: 26, y: 92, accepts: "voltmeter" });
  } else {
    // Series: cells in a row at y≈48%, then ammeter, rheostat, switch
    const xStart = 18, xEnd = 60;
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 30 : xStart + ((xEnd - xStart) * i) / (n - 1);
      slots.push({ id: `c${i}`, x, y: 48, accepts: "solar" });
    }
    slots.push({ id: "amm", x: 70, y: 48, accepts: "ammeter" });
    slots.push({ id: "rh",  x: 80, y: 48, accepts: "rheostat" });
    slots.push({ id: "sw",  x: 90, y: 48, accepts: "switch" });
    slots.push({ id: "vm",  x: 38, y: 86, accepts: "voltmeter" });
  }
  return slots;
}

interface Props { mode: Combination; cells: number; onSuccess: () => void; }

export function CircuitBuilder({ mode, cells, onSuccess }: Props) {
  const slots = useMemo(() => buildSlots(mode, cells), [mode, cells]);
  const [placed, setPlaced] = useState<Record<string, ApparatusId | undefined>>({});
  const [dragging, setDragging] = useState<ApparatusId | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ at: number; bad: string[] } | null>(null);
  const [success, setSuccess] = useState(false);

  const filledCorrect = useMemo(
    () => slots.filter(s => placed[s.id] === s.accepts).length,
    [placed, slots],
  );
  const progress = (filledCorrect / slots.length) * 100;

  const onDropSlot = (slotId: string) => {
    if (!dragging) return;
    setPlaced(p => ({ ...p, [slotId]: dragging }));
    setDragging(null);
    setHoverSlot(null);
    setErrorState(null);
  };
  const removeSlot = (slotId: string) => {
    setPlaced(p => { const n = { ...p }; delete n[slotId]; return n; });
    setErrorState(null);
  };

  const checkCircuit = () => {
    const bad: string[] = [];
    slots.forEach(s => { if (placed[s.id] !== s.accepts) bad.push(s.id); });
    if (bad.length === 0) {
      setSuccess(true);
      setErrorState(null);
      setTimeout(onSuccess, 1800);
      return;
    }
    setErrorState({ at: Date.now(), bad });
    // auto-clear the highlight after a moment
    setTimeout(() => setErrorState(s => (s && s.at === Date.now() - 0 ? s : s)), 0);
  };

  const reset = () => { setPlaced({}); setErrorState(null); setSuccess(false); };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-5">
      {/* Palette */}
      <aside className="glass-strong rounded-2xl p-4 gradient-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Apparatus</div>
        <h3 className="font-semibold mb-3">Drag onto the workspace</h3>
        <div className="grid grid-cols-2 gap-2">
          {CATALOGUE.map(a => (
            <motion.div
              key={a.id}
              draggable
              onDragStart={() => setDragging(a.id)}
              onDragEnd={() => setDragging(null)}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="cursor-grab active:cursor-grabbing select-none glass rounded-xl p-2.5 flex flex-col items-center gap-1 border border-border/40 hover:border-[color:var(--neon-cyan)]"
              style={{ boxShadow: dragging === a.id ? `0 0 20px ${a.color}` : undefined }}
            >
              <a.icon className="w-5 h-5" style={{ color: a.color, filter: `drop-shadow(0 0 6px ${a.color})` }} />
              <span className="text-[10px] text-center text-muted-foreground leading-tight">{a.label}</span>
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Workspace */}
      <section className="glass-strong rounded-2xl p-4 gradient-border relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Step 02 · {mode === "parallel" ? "Parallel" : "Series"} · {cells} cell{cells > 1 ? "s" : ""}
            </div>
            <h3 className="font-semibold">Wire the circuit. No hints — figure it out.</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block w-40 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full" animate={{ width: `${progress}%` }}
                style={{ background: "linear-gradient(90deg,var(--neon-cyan),var(--neon-purple))",
                         boxShadow: "0 0 12px var(--neon-cyan)" }} />
            </div>
            <button onClick={reset} className="text-xs glass rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5 hover:text-[var(--neon-pink)]">
              <RotateCcw className="w-3.5 h-3.5"/>Reset
            </button>
            <button onClick={checkCircuit}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-[var(--primary-foreground)]"
              style={{ background: "linear-gradient(135deg,var(--neon-cyan),var(--neon-purple))",
                       boxShadow: "0 0 18px color-mix(in oklab,var(--neon-cyan) 50%,transparent)" }}>
              Check Circuit
            </button>
          </div>
        </div>

        <div className="relative aspect-[1000/520] w-full rounded-xl border border-border/40 bg-[radial-gradient(ellipse_at_center,oklch(0.13_0.03_265/0.8),oklch(0.08_0.02_260/0.95))] overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <SunRays active={placed[slots[0].id] === "light"} />

          {/* Wires */}
          <svg viewBox="0 0 1000 520" className="absolute inset-0 w-full h-full pointer-events-none">
            <CircuitWires mode={mode} cells={cells} success={success} />
          </svg>

          {/* error full-canvas red glow */}
          <AnimatePresence>
            {errorState && (
              <motion.div
                key={errorState.at}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 1.4 }}
                exit={{ opacity: 0 }}
                onAnimationComplete={() => setErrorState(null)}
                className="absolute inset-0 pointer-events-none"
                style={{ boxShadow: "inset 0 0 80px var(--destructive)", background: "color-mix(in oklab,var(--destructive) 8%,transparent)" }}
              />
            )}
          </AnimatePresence>

          {/* Slots — generic, no labels revealed */}
          {slots.map(s => {
            const value = placed[s.id];
            const correct = value === s.accepts;
            const isBad = errorState?.bad.includes(s.id);
            const item = value ? byId(value) : null;
            const slotSize = cells > 6 && (s.id.startsWith("c")) ? 56 : 70;
            return (
              <div
                key={s.id}
                onDragOver={(e) => { e.preventDefault(); setHoverSlot(s.id); }}
                onDragLeave={() => setHoverSlot(h => h === s.id ? null : h)}
                onDrop={(e) => { e.preventDefault(); onDropSlot(s.id); }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <motion.div
                  animate={{
                    scale: hoverSlot === s.id ? 1.1 : isBad ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ repeat: isBad ? 3 : 0, duration: 0.45 }}
                  className="rounded-full glass grid place-items-center relative"
                  style={{
                    width: slotSize, height: slotSize,
                    border: `1.5px dashed ${
                      correct ? "var(--neon-cyan)" :
                      isBad   ? "var(--destructive)" :
                      hoverSlot === s.id ? "var(--neon-purple)" :
                      "color-mix(in oklab,var(--neon-cyan) 25%,transparent)"
                    }`,
                    boxShadow: correct
                      ? "0 0 18px color-mix(in oklab,var(--neon-cyan) 60%,transparent)"
                      : isBad
                      ? "0 0 22px color-mix(in oklab,var(--destructive) 70%,transparent)"
                      : hoverSlot === s.id ? "0 0 18px var(--neon-purple)" : undefined,
                  }}
                >
                  {item ? (
                    <button onClick={() => removeSlot(s.id)} className="grid place-items-center w-full h-full rounded-full">
                      <item.icon className="w-6 h-6" style={{ color: item.color, filter: `drop-shadow(0 0 8px ${item.color})` }} />
                    </button>
                  ) : (
                    <HelpCircle className="w-5 h-5 opacity-30" />
                  )}
                </motion.div>
              </div>
            );
          })}

          <AnimatePresence>{success && <ElectronsFlow mode={mode} cells={cells} />}</AnimatePresence>
        </div>

        {/* generic warning popup, no hints */}
        <AnimatePresence>
          {errorState && (
            <motion.div
              key={errorState.at + "-msg"}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute left-1/2 -translate-x-1/2 top-20 z-20 glass-strong rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm pointer-events-none"
              style={{ border: "1px solid var(--destructive)", boxShadow: "0 0 28px color-mix(in oklab,var(--destructive) 55%,transparent)" }}
            >
              <AlertTriangle className="w-4 h-4 text-[oklch(0.7_0.25_25)]" />
              <span className="text-[oklch(0.85_0.18_25)]">Circuit incorrect — adjust your connections.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success overlay */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm pointer-events-none"
            >
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="glass-strong rounded-2xl px-6 py-4 text-center neon-border">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-7 h-7 text-[var(--neon-cyan)] glow-pulse" />
                  <CheckCircle2 className="w-7 h-7 text-[var(--neon-cyan)]" />
                </div>
                <div className="text-lg font-bold gradient-text mt-1">Experiment Setup Completed</div>
                <div className="text-xs text-muted-foreground">Unlocking simulation…</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

// -------------------- Dynamic SVG wires --------------------
const VW = 1000, VH = 520;
const px = (xPct: number) => (xPct / 100) * VW;
const py = (yPct: number) => (yPct / 100) * VH;

function buildPath(mode: Combination, n: number): string {
  if (mode === "parallel") {
    const branchX = px(26), junctionX = px(46), ammX = px(60), rhX = px(74), swX = px(88);
    const yMid = py(50);
    const yTop = n === 1 ? yMid : py(22);
    const yBot = n === 1 ? yMid : py(78);
    // Light feed top -> down rail, branch in/out at each cell, bus to switch and back
    const railTopY = yTop;
    const railBotY = yBot;
    let d = `M ${px(8)} ${py(14)} L ${px(8)} ${railTopY} L ${branchX} ${railTopY}`;
    // vertical rail through cells
    d += ` M ${branchX} ${railTopY} L ${branchX} ${railBotY}`;
    // each branch -> junction
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? yMid : py(22) + ((py(78) - py(22)) * i) / (n - 1);
      d += ` M ${branchX} ${y} L ${junctionX} ${y} L ${junctionX} ${yMid}`;
    }
    // top bus to switch and return loop
    d += ` M ${junctionX} ${yMid} L ${ammX} ${yMid} L ${rhX} ${yMid} L ${swX} ${yMid}`;
    d += ` L ${swX} ${py(95)} L ${branchX} ${py(95)} L ${branchX} ${railBotY}`;
    return d;
  }
  // series
  const yRow = py(48);
  const xStart = px(18), xEnd = px(60);
  let d = `M ${px(8)} ${py(14)} L ${px(8)} ${yRow} L ${xStart} ${yRow}`;
  d += ` L ${px(70)} ${yRow} L ${px(80)} ${yRow} L ${px(90)} ${yRow}`;
  // return loop
  d += ` L ${px(90)} ${py(86)} L ${xStart} ${py(86)} L ${xStart} ${yRow}`;
  return d;
}

function CircuitWires({ mode, cells, success }: { mode: Combination; cells: number; success: boolean }) {
  const stroke = success ? "var(--neon-cyan)" : "color-mix(in oklab,var(--neon-cyan) 35%,transparent)";
  const glow = success ? "drop-shadow(0 0 6px var(--neon-cyan))" : undefined;
  return <path d={buildPath(mode, cells)} fill="none" stroke={stroke} strokeWidth={2.5} style={{ filter: glow }} />;
}

function ElectronsFlow({ mode, cells }: { mode: Combination; cells: number }) {
  const d = buildPath(mode, cells);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 w-full h-full pointer-events-none">
      <defs><path id="flowPath" d={d} /></defs>
      {Array.from({ length: 10 }).map((_, i) => (
        <circle key={i} r="3" fill="var(--neon-cyan)" style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}>
          <animateMotion dur="3.6s" repeatCount="indefinite" begin={`${i * 0.32}s`}>
            <mpath href="#flowPath" />
          </animateMotion>
        </circle>
      ))}
    </svg>
  );
}

function SunRays({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0.25 }}
      className="absolute left-[8%] top-[14%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      <div className="relative w-24 h-24">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-[2px] h-12 origin-top"
            style={{
              transform: `translate(-50%,0) rotate(${i * 36}deg)`,
              background: "linear-gradient(to bottom,var(--neon-cyan),transparent)",
            }}
            animate={{ opacity: active ? [0.3, 1, 0.3] : 0.2 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
