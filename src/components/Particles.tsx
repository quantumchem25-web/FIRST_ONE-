import { motion } from "framer-motion";

export function Particles({ count = 30 }: { count?: number }) {
  const items = Array.from({ length: count });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 6;
        const duration = 8 + Math.random() * 10;
        const size = 2 + Math.random() * 3;
        const hue = i % 3 === 0 ? "var(--neon-cyan)" : i % 3 === 1 ? "var(--neon-blue)" : "var(--neon-purple)";
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${left}%`, bottom: -10, width: size, height: size, background: hue, boxShadow: `0 0 12px ${hue}` }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -800, opacity: [0, 1, 1, 0] }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}
