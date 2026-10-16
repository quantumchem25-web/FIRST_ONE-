import { useMemo } from "react";
import { Gauge, Thermometer } from "lucide-react";
import { irradianceLinearity, temperatureCoefficients } from "@/lib/analysis";

interface Props {
  intensity: number;
  temperature: number;
  area: number;
}

export function CoefficientPanel({ intensity, temperature, area }: Props) {
  const temp = useMemo(() => temperatureCoefficients({ intensity, temperature, area }), [intensity, temperature, area]);
  const light = useMemo(() => irradianceLinearity({ intensity, temperature, area }), [intensity, temperature, area]);

  const items = [
    {
      label: "dVoc / dT",
      value: `${temp.dVocPerC.toFixed(2)} mV/°C`,
      text: "Voltage drops as the cell heats up. Silicon is usually close to −2 mV per °C.",
    },
    {
      label: "dIsc / dT",
      value: `${temp.dIscPerC >= 0 ? "+" : ""}${temp.dIscPerC.toFixed(4)} mA/°C`,
      text: "Current barely changes with temperature in this model, so power loss comes from voltage.",
    },
    {
      label: "dPmax / dT",
      value: `${temp.dPmaxPerC.toFixed(3)} mW/°C`,
      text: "Each extra degree costs this much output power.",
    },
    {
      label: "Relative power loss",
      value: `${temp.relPmaxPctPerC.toFixed(3)} %/°C`,
      text: "Compared with the power at 25 °C. Datasheets quote this number.",
    },
  ];

  const iscSlope = light.isc.slope * 100; // mA per 100 W/m2
  const vocSlope = light.voc.slope * 100 * 1000; // mV per 100 W/m2

  return (
    <section className="glass-strong rounded-2xl p-6 gradient-border">
      <h2 className="font-semibold flex items-center gap-2">
        <Thermometer className="w-4 h-4 text-[var(--neon-cyan)]" /> Temperature coefficients
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Calculated live by fitting a straight line through a 0–75 °C sweep at {intensity} W/m².
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {items.map(i => (
          <div key={i.label} className="glass rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{i.label}</div>
            <div className="text-lg font-semibold mt-1 tabular-nums">{i.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{i.text}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Fit quality for Voc: R² = {temp.r2Voc.toFixed(4)}</p>

      <h3 className="font-semibold mt-6 flex items-center gap-2 text-sm">
        <Gauge className="w-4 h-4 text-[var(--neon-cyan)]" /> Light response at {temperature} °C
      </h3>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Isc per +100 W/m²</div>
          <div className="text-lg font-semibold mt-1 tabular-nums">+{iscSlope.toFixed(2)} mA</div>
          <p className="text-xs text-muted-foreground mt-1">Current grows in a straight line with light (R² = {light.isc.r2.toFixed(4)}).</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Voc per +100 W/m²</div>
          <div className="text-lg font-semibold mt-1 tabular-nums">+{vocSlope.toFixed(1)} mV</div>
          <p className="text-xs text-muted-foreground mt-1">Voltage only grows logarithmically, so a straight fit is weaker (R² = {light.voc.r2.toFixed(4)}).</p>
        </div>
      </div>
    </section>
  );
}
