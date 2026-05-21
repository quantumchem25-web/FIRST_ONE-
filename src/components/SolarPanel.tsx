import { motion } from "framer-motion";
import { Sun } from "lucide-react";

export function SolarPanel({ intensity = 1000 }: { intensity?: number }) {
  const t = Math.min(1, intensity / 1500);
  const cells = Array.from({ length: 24 });
  return (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center">
      {/* Sun */}
      <motion.div
        className="absolute top-4 right-6 z-10"
        animate={{ scale: [1, 1.08, 1], rotate: 360 }}
        transition={{ scale: { duration: 3, repeat: Infinity }, rotate: { duration: 60, repeat: Infinity, ease: "linear" } }}
      >
        <div className="relative">
          <Sun className="w-16 h-16 text-yellow-300 glow-pulse" style={{ filter: `drop-shadow(0 0 ${10 + t * 30}px rgb(252,211,77))` }} />
        </div>
      </motion.div>

      {/* Sunlight rays */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 + t * 0.5 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.line
            key={i}
            x1="80%" y1="15%"
            x2={`${20 + i * 8}%`} y2="80%"
            stroke="url(#rayGrad)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.8, 0] }}
            transition={{ duration: 2.4, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
        <defs>
          <linearGradient id="rayGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(252,211,77)" />
            <stop offset="100%" stopColor="rgb(34,211,238)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Panel */}
      <motion.div
        initial={{ rotateX: 60, opacity: 0 }}
        animate={{ rotateX: 18, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        className="relative w-[78%] aspect-[3/2]"
      >
        <div className="absolute inset-0 rounded-xl glass-strong neon-border p-3 grid grid-cols-6 gap-1.5">
          {cells.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-sm"
              style={{
                background: `linear-gradient(135deg, oklch(0.3 0.1 250), oklch(0.2 0.1 270))`,
                boxShadow: `inset 0 0 8px color-mix(in oklab, var(--neon-cyan) ${20 + t * 50}%, transparent)`
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, delay: i * 0.05, repeat: Infinity }}
            />
          ))}
        </div>
        {/* Stand */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-2 h-12 bg-gradient-to-b from-[var(--neon-cyan)]/40 to-transparent" />
      </motion.div>

      {/* Electron flow */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 -bottom-2 w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)]"
          style={{ boxShadow: "0 0 12px var(--neon-cyan)" }}
          animate={{ x: [-80, 80], opacity: [0, 1, 0] }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}
