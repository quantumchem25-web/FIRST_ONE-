import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  accent?: "cyan" | "purple" | "blue" | "pink";
  hint?: string;
}

const accentMap = {
  cyan: "var(--neon-cyan)",
  blue: "var(--neon-blue)",
  purple: "var(--neon-purple)",
  pink: "var(--neon-pink)",
};

export function Meter({ label, value, unit, icon: Icon, accent = "cyan", hint }: Props) {
  const color = accentMap[accent];
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass rounded-xl p-4 relative overflow-hidden gradient-border"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      </div>
      <div className="flex items-baseline gap-1">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold tabular-nums"
          style={{ color, textShadow: `0 0 12px color-mix(in oklab, ${color} 60%, transparent)` }}
        >
          {value}
        </motion.span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: color }} />
    </motion.div>
  );
}
