import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold gradient-text">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-[var(--neon-cyan)]">
          {format ? format(value) : value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-cyan-400"
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm glass hover:bg-white/5 transition"
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`relative inline-block h-5 w-10 rounded-full transition ${
          checked ? "bg-cyan-400/70" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-strong rounded-2xl p-5 ${className}`}>
      <header className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function Insight({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "good" }) {
  const color =
    tone === "warn"
      ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
      : tone === "good"
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
        : "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${color}`}>{children}</div>;
}

export const chartTooltipStyle = {
  background: "rgba(8,12,28,0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
};

export const axisProps = {
  stroke: "rgba(255,255,255,0.45)",
  tick: { fontSize: 11 },
} as const;
