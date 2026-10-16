import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Thermometer, CloudSun, Crosshair, Sunrise, FlaskConical } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { SweepPanel } from "@/components/studio/SweepPanel";
import { ShadingStudio } from "@/components/studio/ShadingStudio";
import { MpptPanel } from "@/components/studio/MpptPanel";
import { DayPanel } from "@/components/studio/DayPanel";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Photon Lab" },
      { name: "description", content: "Advanced solar analysis: temperature and irradiance sweeps, partial shading with bypass diodes, MPPT algorithms and daily energy yield." },
      { property: "og:title", content: "Photon Studio — Advanced Solar Analysis" },
      { property: "og:description", content: "Explore shading, MPPT tracking, temperature effects and daily energy yield." },
    ],
  }),
  component: Studio,
});

const TABS = [
  { id: "sweep", label: "Sweeps", icon: Thermometer, blurb: "How temperature and sunlight change every cell parameter." },
  { id: "shade", label: "Shading", icon: CloudSun, blurb: "Cover cells, add bypass diodes and watch the P–V curve grow extra peaks." },
  { id: "mppt", label: "MPPT", icon: Crosshair, blurb: "Race two tracking algorithms against changing sunlight." },
  { id: "day", label: "Day yield", icon: Sunrise, blurb: "Estimate the energy an array collects in a full day." },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Studio() {
  const [tab, setTab] = useState<TabId>("sweep");
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Navbar />
      <main className="relative z-10 pt-32 md:pt-28 pb-16 px-4 max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full glass text-[var(--neon-cyan)] mb-3">
            <FlaskConical className="w-3.5 h-3.5" /> New · Photon Studio
          </div>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text">Advanced Solar Studio</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Go beyond the basic I-V experiment. Four extra workbenches let you test real-world effects: heat, shade, smart tracking and a full day of sunshine.
          </p>
        </motion.div>

        <div className="glass rounded-2xl p-1.5 flex flex-wrap gap-1 mb-2">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex-1 min-w-[110px] px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition ${
                  on ? "text-[var(--neon-cyan)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {on && <motion.div layoutId="studiotab" className="absolute inset-0 rounded-xl bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] neon-border" />}
                <t.icon className="w-4 h-4 relative" />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mb-6 px-2">{current.blurb}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "sweep" && <SweepPanel />}
            {tab === "shade" && <ShadingStudio />}
            {tab === "mppt" && <MpptPanel />}
            {tab === "day" && <DayPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
