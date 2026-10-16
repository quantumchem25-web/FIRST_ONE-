import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { SweepExplorer } from "@/components/explorer/SweepExplorer";
import { CoefficientPanel } from "@/components/explorer/CoefficientPanel";
import { MpptSimulator } from "@/components/explorer/MpptSimulator";
import { DayYield } from "@/components/explorer/DayYield";
import { Notebook } from "@/components/explorer/Notebook";
import { computeCell } from "@/lib/physics";

export const Route = createFileRoute("/analyzer")({
  head: () => ({
    meta: [
      { title: "Analyzer — Photon Lab" },
      { name: "description", content: "Sweep irradiance and temperature, track the maximum power point, estimate daily energy yield and keep a lab notebook." },
      { property: "og:title", content: "Analyzer — Photon Lab" },
      { property: "og:description", content: "Advanced analysis tools for the solar cell experiment." },
    ],
  }),
  component: Analyzer,
});

function Analyzer() {
  const [intensity, setIntensity] = useState(1000);
  const [temperature, setTemperature] = useState(25);
  const [area, setArea] = useState(4);

  const live = computeCell({ intensity, temperature, area });

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <Particles count={18} />
      <Navbar />
      <main className="relative max-w-6xl mx-auto px-6 pt-32 pb-16">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Section 06</div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text flex items-center gap-3">
          <LineChart className="w-9 h-9" /> Analyzer
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Go beyond a single I-V curve. Sweep conditions, measure temperature coefficients, watch a tracker chase the
          peak power, estimate a full day of energy and keep notes on every run.
        </p>

        <section className="glass-strong rounded-2xl p-6 gradient-border mt-8">
          <h2 className="font-semibold mb-4">Working conditions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Control label="Irradiance" unit="W/m²" value={intensity} min={200} max={1500} step={50} onChange={setIntensity} />
            <Control label="Temperature" unit="°C" value={temperature} min={0} max={75} step={1} onChange={setTemperature} />
            <Control label="Cell area" unit="cm²" value={area} min={1} max={20} step={1} onChange={setArea} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 text-center">
            <Readout label="Isc" value={`${(live.Isc * 1000).toFixed(1)} mA`} />
            <Readout label="Voc" value={`${live.Voc.toFixed(3)} V`} />
            <Readout label="Pmax" value={`${(live.Pmax * 1000).toFixed(2)} mW`} />
            <Readout label="Fill factor" value={live.FF.toFixed(3)} />
            <Readout label="Efficiency" value={`${live.efficiency.toFixed(2)} %`} />
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <SweepExplorer intensity={intensity} temperature={temperature} area={area} />
          <CoefficientPanel intensity={intensity} temperature={temperature} area={area} />
        </div>

        <div className="mt-6">
          <MpptSimulator intensity={intensity} temperature={temperature} />
        </div>

        <div className="mt-6">
          <DayYield area={area} />
        </div>

        <div className="mt-6">
          <Notebook intensity={intensity} temperature={temperature} area={area} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Control(props: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">{props.label}</span>
        <span className="tabular-nums font-medium">
          {props.value} {props.unit}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={e => props.onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--neon-cyan)]"
      />
    </label>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl py-3 px-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
