import type { ReactNode } from "react";

export const AXIS = "oklch(0.7 0.03 255)";
export const GRID = "oklch(1 0 0 / 0.06)";

export const COLORS = {
  cyan: "var(--neon-cyan)",
  purple: "var(--neon-purple)",
  pink: "var(--neon-pink)",
  blue: "var(--neon-blue)",
};

interface SliderProps {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  digits?: number;
  hint?: string;
}

export function LabeledSlider({ label, unit, value, min, max, step = 1, onChange, digits = 0, hint }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-[var(--neon-cyan)] font-medium">
          {value.toFixed(digits)}
          {unit ? <span className="text-muted-foreground ml-1">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--neon-cyan)] cursor-pointer"
        aria-label={label}
      />
      {hint ? <div className="text-[10px] text-muted-foreground/80">{hint}</div> : null}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  tone?: "cyan" | "purple" | "pink" | "plain";
  sub?: string;
}

export function Stat({ label, value, unit, tone = "cyan", sub }: StatProps) {
  const color = tone === "plain" ? "var(--foreground)" : COLORS[tone];
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color }}>
        {value}
        {unit ? <span className="text-xs text-muted-foreground ml-1 font-normal">{unit}</span> : null}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div> : null}
    </div>
  );
}

interface PanelProps {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, icon, right, children, className = "" }: PanelProps) {
  return (
    <section className={`glass-strong rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-sm md:text-base">
          {icon}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="space-y-1.5">
      {label ? <div className="text-xs text-muted-foreground">{label}</div> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                on
                  ? "border-[var(--neon-cyan)] bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] text-[var(--neon-cyan)]"
                  : "border-border/50 glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative w-9 h-5 rounded-full transition ${
          checked ? "bg-[var(--neon-cyan)]" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
      <span>
        <span className="text-sm">{label}</span>
        {hint ? <span className="block text-[10px] text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

interface TipProps {
  active?: boolean;
  payload?: { dataKey?: string | number; name?: string; value?: number | string; color?: string }[];
  label?: number | string;
  labelFormatter?: (l: number | string) => string;
  valueFormatter?: (v: number, key: string) => string;
}

export function ChartTip({ active, payload, label, labelFormatter, valueFormatter }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs space-y-0.5">
      <div className="text-muted-foreground">{labelFormatter && label !== undefined ? labelFormatter(label) : label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="tabular-nums" style={{ color: p.color || "var(--neon-cyan)" }}>
          {p.name ?? p.dataKey}:{" "}
          {typeof p.value === "number" && valueFormatter ? valueFormatter(p.value, String(p.dataKey)) : p.value}
        </div>
      ))}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-[var(--neon-purple)] pl-3">
      {children}
    </p>
  );
}

export function ExportButton({ onClick, label = "CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg glass hover:text-[var(--neon-cyan)] transition"
    >
      ⬇ {label}
    </button>
  );
}
