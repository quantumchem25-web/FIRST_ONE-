import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Activity, Gauge, Atom, Sparkles, BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { SolarPanel } from "@/components/SolarPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Photon Lab — Virtual Solar Cell Experiment" },
      { name: "description", content: "Futuristic virtual physics laboratory to determine fill factor, efficiency and maximum power of a solar cell." },
      { property: "og:title", content: "Photon Lab — Virtual Solar Cell Experiment" },
      { property: "og:description", content: "Interactive simulation of I-V characteristics, fill factor and efficiency." },
    ],
  }),
  component: Home,
});

const stats = [
  { label: "Sampling Rate", value: "60", unit: "Hz", icon: Activity },
  { label: "Sweep Points", value: "140", unit: "pts", icon: Gauge },
  { label: "Models", value: "1-Diode", unit: "phys.", icon: Atom },
  { label: "Outputs", value: "FF · η · Pmax", unit: "live", icon: Zap },
];

function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <Particles count={40} />
      <Navbar />

      <section className="relative max-w-6xl mx-auto px-6 pt-36 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs text-[var(--neon-cyan)] mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Virtual Physics Laboratory
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            <span className="gradient-text">Solar Cell</span>
            <br />Characteristics, in real time.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 text-lg text-muted-foreground max-w-xl">
            Sweep load resistance, light intensity and temperature to extract <span className="text-foreground">fill factor</span>, <span className="text-foreground">efficiency</span> and the resistance at <span className="text-foreground">maximum workable power</span> — backed by a single-diode model.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/lab" className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--neon-cyan)] text-[var(--primary-foreground)] font-medium neon-border hover:scale-[1.02] transition">
              Launch Simulation <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
            <Link to="/theory" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass-strong hover:bg-[color-mix(in_oklab,var(--neon-purple)_15%,transparent)] transition">
              <BookOpen className="w-4 h-4" /> Read Theory
            </Link>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                className="glass rounded-xl p-3">
                <s.icon className="w-4 h-4 text-[var(--neon-cyan)] mb-2" />
                <div className="text-lg font-semibold tabular-nums">{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label} · {s.unit}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="float">
          <div className="glass-strong rounded-3xl p-6 neon-border-purple relative scan-lines">
            <SolarPanel intensity={1200} />
            <div className="mt-4 text-center text-xs text-muted-foreground tracking-widest uppercase">Live Photovoltaic Module · Class A</div>
          </div>
        </motion.div>
      </section>

      {/* Feature strip */}
      <section className="relative max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-5">
        {[
          { title: "Single-Diode Physics", desc: "Realistic I = Isc − I₀(eᵛ⁄ⁿVₜ − 1) model with temperature & irradiance dependence.", icon: Atom },
          { title: "Auto MPP Detection", desc: "Automatic detection of maximum power point with Vmp, Imp and Rmp readouts.", icon: Zap },
          { title: "Lab-Grade Outputs", desc: "Export observation tables to CSV/PDF, ready for your viva submission.", icon: Gauge },
        ].map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-6 gradient-border">
            <f.icon className="w-6 h-6 text-[var(--neon-cyan)] mb-3" />
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <Footer />
    </div>
  );
}
