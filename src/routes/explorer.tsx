import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloudSun, Compass, Thermometer } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { DayYieldPanel } from "@/components/explorer/DayYieldPanel";
import { ShadingPanel } from "@/components/explorer/ShadingPanel";
import { TemperaturePanel } from "@/components/explorer/TemperaturePanel";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Solar Explorer — Photon Lab" },
      {
        name: "description",
        content:
          "Explore daily solar energy yield, partial shading with bypass diodes, and temperature effects on a solar cell.",
      },
    ],
  }),
  component: ExplorerPage,
});

const TABS = [
  { id: "day", label: "Day Yield", icon: Compass, blurb: "How much energy will my panels make in a day?" },
  { id: "shade", label: "Shading Lab", icon: CloudSun, blurb: "What happens when a leaf or shadow covers part of a panel?" },
  { id: "temp", label: "Temperature", icon: Thermometer, blurb: "Why do hot panels make less power?" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ExplorerPage() {
  const [tab, setTab] = useState<TabId>("day");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Navbar />
      <main className="relative z-10 mx-auto w-[min(96vw,1200px)] pt-32 pb-16 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">New experiment suite</div>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">
            Solar <span className="gradient-text">Explorer</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three extra experiments that go beyond the basic I-V curve: real-world daily energy, partial shading and
            heat. Move the sliders and watch the physics respond instantly.
          </p>
        </motion.div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative rounded-2xl p-4 text-left transition ${
                  on ? "glass-strong neon-border" : "glass hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <t.icon className={`h-5 w-5 ${on ? "text-[var(--neon-cyan)]" : "text-muted-foreground"}`} />
                  <span className="font-semibold">{t.label}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{t.blurb}</div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <p className="mb-4 text-sm text-muted-foreground">{active.blurb}</p>
            {tab === "day" && <DayYieldPanel />}
            {tab === "shade" && <ShadingPanel />}
            {tab === "temp" && <TemperaturePanel />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
