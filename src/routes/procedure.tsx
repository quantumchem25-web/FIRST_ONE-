import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Flag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";

export const Route = createFileRoute("/procedure")({
  head: () => ({
    meta: [
      { title: "Procedure — Photon Lab" },
      { name: "description", content: "Procedure, precautions and conclusion for the solar cell experiment." },
      { property: "og:title", content: "Experiment Procedure — Photon Lab" },
      { property: "og:description", content: "Step-by-step lab procedure with precautions and conclusion." },
    ],
  }),
  component: Procedure,
});

const steps = [
  "Open the Lab page and set the light intensity to 1000 W/m² and temperature to 25 °C.",
  "Slowly increase the load resistance from a low value (≈1 Ω) up to ≈200 Ω.",
  "At each step, observe the live voltage, current and power readouts.",
  "Click 'Add Reading' to record the operating point in the observation table.",
  "Locate the maximum power point (highlighted on the P–V curve).",
  "Note the resistance Rmp at which power is maximum.",
  "Compute Fill Factor: FF = (Vmp · Imp) / (Voc · Isc).",
  "Compute Efficiency: η = (Pmax / Pin) × 100%.",
  "Repeat for different intensities to study irradiance dependence.",
  "Export the readings as PDF / CSV for your lab report.",
];

const precautions = [
  "Do not exceed the rated short-circuit current of the cell in real setups.",
  "Keep the cell surface clean — dust scatters incoming photons.",
  "Avoid temperature drift; thermal effects reduce Voc and efficiency.",
  "Use a calibrated lux/irradiance meter when comparing physical readings.",
  "Switch between resistances slowly to avoid transient measurement errors.",
];

function Procedure() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <Particles count={18} />
      <Navbar />
      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-16">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Section 02</div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">Procedure</h1>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="glass-strong rounded-2xl p-6 gradient-border">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[var(--neon-cyan)]"/> Steps</h2>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <motion.li key={i} initial={{ opacity:0, x:-10 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ delay: i*0.04 }}
                  className="flex gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-md bg-[color-mix(in_oklab,var(--neon-cyan)_20%,transparent)] text-[var(--neon-cyan)] grid place-items-center text-xs font-semibold">{i+1}</span>
                  <span className="text-muted-foreground leading-relaxed">{s}</span>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="space-y-6">
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[var(--neon-pink)]"/> Precautions</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {precautions.map(p => <li key={p} className="flex gap-2"><span className="text-[var(--neon-pink)]">•</span>{p}</li>)}
              </ul>
            </div>
            <div className="glass-strong rounded-2xl p-6 neon-border-purple">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Flag className="w-5 h-5 text-[var(--neon-purple)]"/> Conclusion</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The solar cell exhibits a non-linear I–V characteristic with a unique maximum power point. The fill factor and efficiency calculated from Vmp, Imp, Voc and Isc quantify how effectively the cell converts incident solar irradiance into usable electrical power. The load resistance corresponding to the maximum workable power is Rmp = Vmp / Imp.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
