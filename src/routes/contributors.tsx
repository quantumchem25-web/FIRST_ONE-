import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Linkedin, Instagram, Sparkles, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import mohitImg from "@/assets/contributors/mohit.jpeg";
import pratikImg from "@/assets/contributors/pratik.jpeg";
import parthImg from "@/assets/contributors/parth.jpeg";
import harshImg from "@/assets/contributors/harsh.jpeg";
import kartikImg from "@/assets/contributors/kartik.jpeg";

export const Route = createFileRoute("/contributors")({
  head: () => ({
    meta: [
      { title: "Contributors — Photon Lab" },
      { name: "description", content: "Meet the team behind the futuristic Solar Cell Virtual Physics Laboratory." },
      { property: "og:title", content: "Contributors — Photon Lab" },
      { property: "og:description", content: "Meet the team behind the futuristic Solar Cell Virtual Physics Laboratory." },
    ],
  }),
  component: ContributorsPage,
});

type Contributor = {
  name: string;
  role?: string;
  linkedin?: string;
  instagram?: string;
  lead?: boolean;
  image?: string;
};

const contributors: Contributor[] = [
  {
    name: "Dr. Mohit Prasad",
    role: "Project Mentor",
    lead: true,
    image: mohitImg,
  },
  {
    name: "Kartik Rana",
    role: "Contributor",
    linkedin: "https://www.linkedin.com/in/kartik-rana-53bb1637b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    instagram: "https://www.instagram.com/kxrtikkk09?igsh=bTU4em5vYWJycnRo",
    image: kartikImg,
  },
  {
    name: "Harsh Sarode",
    role: "Contributor",
    linkedin: "https://www.linkedin.com/in/harsh-sarode-326635382?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    instagram: "https://www.instagram.com/harsh.sarode_?igsh=MWlvdnQxbHBram4xaQ==",
    image: pratikImg,
  },
  {
    name: "Parth Utage",
    role: "Contributor",
    linkedin: "https://www.linkedin.com/in/parth-utage-1991463a7?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
    instagram: "https://www.instagram.com/parth_.512?igsh=MW91ajE5Y3NiMHdpeQ==",
    image: parthImg,
  },
  {
    name: "Pratik Bhoi",
    role: "Contributor",
    linkedin: "https://www.linkedin.com/in/pratik-bhoi-040a013b5/",
    instagram: "https://www.instagram.com/pr4t1kk/",
    image: harshImg,
  },
];

function ContributorCard({ c, i }: { c: Contributor; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-[var(--neon-cyan)] via-[var(--neon-blue)] to-[var(--neon-purple)] opacity-30 blur-md group-hover:opacity-70 transition-opacity duration-500" />
      <div className="relative glass-strong rounded-2xl p-6 flex flex-col items-center text-center overflow-hidden h-full">
        {/* gradient sweep */}
        <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklab,var(--neon-cyan)_8%,transparent)] via-transparent to-[color-mix(in_oklab,var(--neon-purple)_10%,transparent)] pointer-events-none" />
        {c.lead && (
          <div className="absolute top-3 right-3 z-10 text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full gradient-border text-[var(--neon-cyan)] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Mentor
          </div>
        )}

        {/* avatar */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-5"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-purple)] blur-xl opacity-60" />
          <div className="relative w-28 h-28 rounded-full p-[2px] bg-gradient-to-br from-[var(--neon-cyan)] via-[var(--neon-blue)] to-[var(--neon-purple)]">
            <div className="w-full h-full rounded-full bg-[var(--background)] flex items-center justify-center overflow-hidden">
              {c.image ? (
                <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-bold gradient-text">{c.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
              )}
            </div>
          </div>
        </motion.div>

        <h3 className="text-lg font-semibold tracking-wide mb-1">{c.name}</h3>
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-5">
          {c.role}
        </div>

        <div className="flex items-center gap-3 mt-auto">
          {c.linkedin ? (
            <a
              href={c.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn relative flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass neon-border text-[var(--neon-cyan)] hover:bg-[color-mix(in_oklab,var(--neon-cyan)_15%,transparent)] transition"
              aria-label={`${c.name} on LinkedIn`}
            >
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
          ) : null}
          {c.instagram ? (
            <a
              href={c.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group/btn relative flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg glass neon-border-purple text-[var(--neon-purple)] hover:bg-[color-mix(in_oklab,var(--neon-purple)_15%,transparent)] transition"
              aria-label={`${c.name} on Instagram`}
            >
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </a>
          ) : null}
          {!c.linkedin && !c.instagram && (
            <span className="text-[11px] text-muted-foreground italic">Guiding Faculty</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ContributorsPage() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <Particles count={28} />

      <main className="relative pt-32 pb-24 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass neon-border text-[10px] uppercase tracking-[0.3em] text-[var(--neon-cyan)] mb-6">
            <Users className="w-3 h-3" /> The Team
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-5">
            Contributors
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Meet the team behind the futuristic <span className="text-[var(--neon-cyan)]">Solar Cell Virtual Physics Laboratory</span> — a fusion of physics, code, and design crafted to make photovoltaic science feel alive.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {contributors.map((c, i) => (
            <ContributorCard key={c.name} c={c} i={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground"
        >
          ⟡ Built with passion · Photon Lab v.Solar.01 ⟡
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
