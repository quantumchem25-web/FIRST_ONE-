import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Atom, Sun, Zap, Gauge, TrendingUp, Layers, Leaf, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { ReferenceCircuit } from "@/components/ReferenceCircuit";

export const Route = createFileRoute("/theory")({
  head: () => ({
    meta: [
      { title: "Theory — Photon Lab" },
      { name: "description", content: "Photovoltaic effect, PN junction, I-V characteristics, fill factor and efficiency." },
      { property: "og:title", content: "Solar Cell Theory — Photon Lab" },
      { property: "og:description", content: "Educational theory for the solar cell experiment." },
    ],
  }),
  component: Theory,
});

const cards = [
  { icon: Sun, title: "Photovoltaic Effect", body: "When photons of sufficient energy strike a semiconductor, they excite electrons across the band gap, generating electron-hole pairs that produce a current under an internal field." },
  { icon: Layers, title: "PN Junction", body: "A solar cell is essentially a large-area PN junction. The built-in field at the depletion region separates photogenerated carriers, driving electrons to the n-side and holes to the p-side." },
  { icon: TrendingUp, title: "I-V Characteristics", body: "Under illumination, the diode equation shifts: I = Isc − I₀(exp(V/nVₜ) − 1). Short-circuit current Isc and open-circuit voltage Voc bound the curve." },
  { icon: Zap, title: "Maximum Power Point", body: "There exists a unique (Vmp, Imp) where V·I is maximum. Operating the load at Rmp = Vmp/Imp extracts the maximum workable power Pmax." },
  { icon: Gauge, title: "Fill Factor", body: "FF = (Vmp · Imp) / (Voc · Isc). It quantifies how 'square' the I-V curve is. Real cells: 0.7–0.85. Higher FF means a better quality cell." },
  { icon: Atom, title: "Efficiency", body: "η = Pmax / Pin × 100%. Pin = irradiance × area. Modern silicon cells reach 20–25%; lab-record multi-junction cells exceed 47%." },
];

const formulas = [
  { f: "P = V × I", d: "Instantaneous electrical power" },
  { f: "R = V / I", d: "Effective load resistance" },
  { f: "FF = (Vmp · Imp) / (Voc · Isc)", d: "Fill factor (dimensionless)" },
  { f: "η = (Pmax / Pin) × 100%", d: "Conversion efficiency" },
  { f: "I = Isc − I₀(eᵛ⁄ⁿVₜ − 1)", d: "Single-diode model" },
];

function Theory() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <Particles count={20} />
      <Navbar />

      <main className="relative max-w-6xl mx-auto px-6 pt-32 pb-16">
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Section 01</div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text">Theory</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">A concise grounding in photovoltaics — enough to interpret every readout in the simulation.</p>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay: i*0.05 }}
              whileHover={{ y:-4 }} className="glass rounded-2xl p-5 gradient-border">
              <c.icon className="w-6 h-6 text-[var(--neon-cyan)] mb-3" />
              <h3 className="font-semibold mb-1">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Formulas */}
        <h2 className="text-2xl font-bold mt-14 mb-4">Key Formulas</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {formulas.map(f => (
            <motion.div key={f.f} whileHover={{ scale:1.01 }} className="glass-strong rounded-xl p-5 neon-border">
              <div className="font-mono text-lg neon-text">{f.f}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.d}</div>
            </motion.div>
          ))}
        </div>

        {/* Diagram */}
        <h2 className="text-2xl font-bold mt-14 mb-4">PN Junction Diagram</h2>
        <div className="glass-strong rounded-2xl p-6">
          <svg viewBox="0 0 600 220" className="w-full h-auto">
            <defs>
              <linearGradient id="pn" x1="0" x2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.25 25)" stopOpacity="0.7"/>
                <stop offset="48%" stopColor="oklch(0.65 0.25 25)" stopOpacity="0.7"/>
                <stop offset="48%" stopColor="oklch(0.7 0.22 250)" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="oklch(0.7 0.22 250)" stopOpacity="0.7"/>
              </linearGradient>
            </defs>
            <rect x="60" y="60" width="480" height="100" rx="10" fill="url(#pn)" stroke="oklch(1 0 0 / 0.2)"/>
            <text x="180" y="115" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">P</text>
            <text x="420" y="115" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">N</text>
            <line x1="300" y1="50" x2="300" y2="170" stroke="var(--neon-cyan)" strokeDasharray="4 4"/>
            <text x="300" y="40" textAnchor="middle" fill="var(--neon-cyan)" fontSize="12">Depletion Region</text>
            {/* Sun */}
            <circle cx="80" cy="20" r="12" fill="rgb(252,211,77)" />
            {[...Array(5)].map((_,i)=> <line key={i} x1={120 + i*60} y1="0" x2={140 + i*60} y2="55" stroke="rgb(252,211,77)" strokeWidth="1.5"/>) }
            {/* Electrons flowing */}
            <text x="300" y="200" textAnchor="middle" fill="oklch(0.7 0.03 255)" fontSize="11">e⁻ →   external load   ← h⁺</text>
          </svg>
        </div>

        {/* Series / Parallel Reference Circuits */}
        <h2 className="text-2xl font-bold mt-14 mb-2">Reference Circuits</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
          Study these labelled diagrams carefully — they show exactly how every apparatus must be wired.
          You'll need to reproduce these layouts from memory in the Lab simulation.
        </p>
        <div className="grid lg:grid-cols-2 gap-5">
          <ReferenceCircuit mode="series" />
          <ReferenceCircuit mode="parallel" />
        </div>

        {/* Advantages / Disadvantages / Applications of Solar Cells */}
        <h2 className="text-2xl font-bold mt-14 mb-4">Solar Cells — Big Picture</h2>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-5 h-5 text-[var(--neon-cyan)]"/><h3 className="font-semibold">Advantages</h3></div>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Renewable energy source</li>
              <li>Environment friendly &amp; clean</li>
              <li>Low maintenance</li>
              <li>No fuel cost</li>
              <li>Sustainable, scalable energy</li>
            </ul>
          </div>
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-[var(--neon-pink)]"/><h3 className="font-semibold">Disadvantages</h3></div>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Weather dependent</li>
              <li>High initial installation cost</li>
              <li>Lower conversion efficiency</li>
              <li>Requires large surface area</li>
            </ul>
          </div>
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-[var(--neon-purple)]"/><h3 className="font-semibold">Applications</h3></div>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Street lights</li>
              <li>Satellites &amp; space probes</li>
              <li>Homes &amp; rooftops</li>
              <li>Industries &amp; solar farms</li>
              <li>Portable devices &amp; calculators</li>
            </ul>
          </div>
        </div>

        {/* Renewable energy importance */}
        <h2 className="text-2xl font-bold mt-14 mb-4 flex items-center gap-2"><Leaf className="w-6 h-6 text-[var(--neon-cyan)]"/> Why Renewable Energy Matters</h2>
        <div className="glass-strong rounded-2xl p-6 gradient-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The world's energy demand is growing while fossil reserves shrink and carbon emissions accelerate climate change.
            Renewable sources — and solar in particular — are central to <span className="text-foreground">sustainable development</span>:
            they reduce air pollution, cut greenhouse gases, decentralize power generation, and create resilient grids.
            As cell efficiencies climb past 25% and costs continue to fall, solar is rapidly becoming the cheapest electricity in human history,
            unlocking <span className="text-foreground">clean energy access</span> for billions and powering the transition to a net-zero future.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
