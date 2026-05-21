import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, Check, X, RotateCcw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz & Viva — Photon Lab" },
      { name: "description", content: "Interactive MCQ quiz and viva questions for the solar cell experiment." },
      { property: "og:title", content: "Quiz & Viva — Photon Lab" },
      { property: "og:description", content: "Test your understanding of solar cell theory and practice." },
    ],
  }),
  component: Quiz,
});

const mcqs = [
  { q: "Which parameter quantifies the 'squareness' of the I-V curve?", o: ["Efficiency", "Fill Factor", "Quantum yield", "Series resistance"], a: 1 },
  { q: "At maximum power point, the load resistance equals:", o: ["Voc / Isc", "Vmp / Imp", "Voc / Imp", "Vmp / Isc"], a: 1 },
  { q: "Increasing temperature primarily:", o: ["Increases Voc", "Decreases Voc", "Increases efficiency", "Has no effect"], a: 1 },
  { q: "The single-diode model includes which equation?", o: ["I = V/R", "I = Isc − I₀(eᵛ⁄ⁿVₜ − 1)", "P = mc²", "V = L dI/dt"], a: 1 },
  { q: "Pin in efficiency calculation refers to:", o: ["Power dissipated", "Incident solar power", "Power at load", "Maximum power"], a: 1 },
];

const vivas = [
  { q: "What is the photovoltaic effect?", a: "It is the generation of voltage and current in a material upon exposure to light, due to photons creating electron-hole pairs that are separated by an internal electric field." },
  { q: "Why does Voc decrease with temperature?", a: "Because the reverse saturation current I₀ rises strongly with T, and Voc ∝ ln(Isc/I₀); the increase in I₀ dominates, lowering Voc by ~2 mV/°C for silicon." },
  { q: "What is the difference between Pmax and Pin?", a: "Pmax is the maximum electrical power the cell delivers (Vmp × Imp); Pin is the optical power incident on the cell area (irradiance × area)." },
  { q: "Why is Rmp important?", a: "Operating the cell at the load Rmp = Vmp/Imp extracts the maximum workable power; mismatched loads waste a portion of the achievable power." },
  { q: "What does a high fill factor indicate?", a: "Low internal series resistance and high shunt resistance — i.e., a high-quality cell whose I-V curve is close to rectangular." },
  { q: "How does irradiance affect Isc and Voc?", a: "Isc scales nearly linearly with irradiance; Voc grows only logarithmically with irradiance." },
];

function Quiz() {
  const [answers, setAnswers] = useState<(number|null)[]>(Array(mcqs.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState<number|null>(null);

  const score: number = answers.reduce<number>((s, a, i) => s + (a === mcqs[i].a ? 1 : 0), 0);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <Particles count={18} />
      <Navbar />
      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-16">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Section 03</div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text flex items-center gap-3"><Brain className="w-9 h-9"/> Quiz & Viva</h1>

        <div className="grid lg:grid-cols-2 gap-6 mt-10">
          {/* MCQ */}
          <div className="glass-strong rounded-2xl p-6 gradient-border">
            <h2 className="font-semibold mb-4">MCQ Quiz</h2>
            <div className="space-y-5">
              {mcqs.map((m, i) => (
                <div key={i}>
                  <div className="text-sm font-medium mb-2">{i+1}. {m.q}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.o.map((opt, oi) => {
                      const sel = answers[i] === oi;
                      const correct = submitted && oi === m.a;
                      const wrong = submitted && sel && oi !== m.a;
                      return (
                        <button key={oi} onClick={() => !submitted && setAnswers(a => a.map((v,k)=>k===i?oi:v))}
                          className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                            correct ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" :
                            wrong ? "border-rose-400/60 bg-rose-400/10 text-rose-300" :
                            sel ? "border-[var(--neon-cyan)]/60 bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] text-[var(--neon-cyan)]" :
                            "border-border/40 hover:border-[var(--neon-cyan)]/40"
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3">
              {!submitted ? (
                <button onClick={() => setSubmitted(true)} disabled={answers.some(a=>a===null)}
                  className="px-4 py-2 rounded-lg bg-[var(--neon-cyan)] text-[var(--primary-foreground)] font-medium disabled:opacity-40">Submit</button>
              ) : (
                <button onClick={() => { setSubmitted(false); setAnswers(Array(mcqs.length).fill(null)); }}
                  className="px-4 py-2 rounded-lg glass inline-flex items-center gap-2"><RotateCcw className="w-4 h-4"/> Retry</button>
              )}
              {submitted && (
                <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} className="text-sm">
                  Score: <span className="text-[var(--neon-cyan)] font-bold">{score}</span> / {mcqs.length}
                </motion.div>
              )}
            </div>
          </div>

          {/* Viva */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Viva Questions</h2>
            <div className="space-y-2">
              {vivas.map((v, i) => (
                <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
                  <button onClick={() => setOpen(o => o === i ? null : i)} className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-[color-mix(in_oklab,var(--neon-cyan)_8%,transparent)] transition">
                    <span className="text-sm">{i+1}. {v.q}</span>
                    <ChevronDown className={`w-4 h-4 transition ${open===i ? "rotate-180 text-[var(--neon-cyan)]" : "text-muted-foreground"}`}/>
                  </button>
                  <AnimatePresence>
                    {open === i && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                        className="overflow-hidden">
                        <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border/40 leading-relaxed">{v.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {submitted && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            className={`mt-6 glass-strong rounded-2xl p-5 inline-flex items-center gap-3 ${score >= 4 ? "neon-border" : ""}`}>
            {score === mcqs.length ? <Check className="w-5 h-5 text-emerald-400"/> : <X className="w-5 h-5 text-[var(--neon-pink)]"/>}
            <span className="text-sm">{score === mcqs.length ? "Perfect run — you're ready for the viva!" : "Review the theory section and try again."}</span>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
