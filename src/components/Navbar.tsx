import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sun, Activity, BookOpen, ListChecks, Brain, Sparkles, Users, Compass } from "lucide-react";

const links = [
  { to: "/", label: "Home", icon: Sparkles },
  { to: "/lab", label: "Lab", icon: Activity },
  { to: "/explorer", label: "Explorer", icon: Compass },
  { to: "/theory", label: "Theory", icon: BookOpen },
  { to: "/procedure", label: "Procedure", icon: ListChecks },
  { to: "/quiz", label: "Quiz & Viva", icon: Brain },
  { to: "/contributors", label: "Contributors", icon: Users },
];

export function Navbar() {
  const loc = useLocation();
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,1100px)]"
    >
      <div className="glass-strong rounded-2xl px-4 py-2.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Sun className="w-6 h-6 text-[var(--neon-cyan)] glow-pulse" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide gradient-text">PHOTON LAB</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">v.Solar.01</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => {
            const active = loc.pathname === l.to;
            return (
              <Link key={l.to} to={l.to} className="relative">
                <span className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${active ? "text-[var(--neon-cyan)]" : "text-muted-foreground hover:text-foreground"}`}>
                  <l.icon className="w-3.5 h-3.5" />
                  {l.label}
                </span>
                {active && (
                  <motion.div layoutId="navpill" className="absolute inset-0 rounded-lg bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] neon-border -z-10" />
                )}
              </Link>
            );
          })}
        </nav>
        <Link to="/lab" className="hidden md:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg gradient-border text-[var(--neon-cyan)] hover:bg-[color-mix(in_oklab,var(--neon-cyan)_10%,transparent)] transition">
          Launch <Activity className="w-3.5 h-3.5" />
        </Link>
      </div>
      {/* mobile */}
      <div className="md:hidden mt-2 glass rounded-xl p-1 flex justify-around">
        {links.map(l => {
          const active = loc.pathname === l.to;
          return (
            <Link key={l.to} to={l.to} className={`flex flex-col items-center px-2 py-1 rounded-lg text-[10px] ${active ? "text-[var(--neon-cyan)]" : "text-muted-foreground"}`}>
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </motion.header>
  );
}
