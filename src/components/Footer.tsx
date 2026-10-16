import { Link } from "@tanstack/react-router";
import { Github, Sun } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/40">
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-5 h-5 text-[var(--neon-cyan)]" />
            <span className="font-semibold gradient-text">PHOTON LAB</span>
          </div>
          <p className="text-sm text-muted-foreground">
            A futuristic virtual physics laboratory for studying the I-V characteristics, fill factor and efficiency of a solar cell.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/lab" className="hover:text-[var(--neon-cyan)]">Simulation</Link></li>
            <li><Link to="/studio" className="hover:text-[var(--neon-cyan)]">Studio</Link></li>
            <li><Link to="/theory" className="hover:text-[var(--neon-cyan)]">Theory</Link></li>
            <li><Link to="/procedure" className="hover:text-[var(--neon-cyan)]">Procedure</Link></li>
            <li><Link to="/quiz" className="hover:text-[var(--neon-cyan)]">Quiz & Viva</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Built with</h4>
          <p className="text-sm text-muted-foreground">React · Vite · Tailwind · Framer Motion · Recharts · Lucide</p>
          <a href="#" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-3 hover:text-foreground"><Github className="w-3.5 h-3.5" /> Project source</a>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground pb-6">© {new Date().getFullYear()} Photon Lab — Solar Cell Experiment</div>
    </footer>
  );
}
