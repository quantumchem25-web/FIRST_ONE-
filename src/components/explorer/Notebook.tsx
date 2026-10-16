import { useEffect, useMemo, useState } from "react";
import { BookMarked, Download, Plus, Trash2, Trophy } from "lucide-react";
import { downloadText, toCsv } from "@/lib/analysis";
import {
  addEntry,
  bestEntry,
  clearEntries,
  formatDate,
  loadEntries,
  parseTags,
  removeEntry,
  snapshot,
  updateNote,
  type NotebookEntry,
} from "@/lib/notebook";

interface Props {
  intensity: number;
  temperature: number;
  area: number;
}

export function Notebook({ intensity, temperature, area }: Props) {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagText, setTagText] = useState("");
  const [filter, setFilter] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // load after mount so server and client render the same first pass
  useEffect(() => {
    setEntries(loadEntries());
    setReady(true);
  }, []);

  const best = useMemo(() => bestEntry(entries), [entries]);

  const allTags = useMemo(() => Array.from(new Set(entries.flatMap(e => e.tags))).sort(), [entries]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => e.tags.includes(q) || e.title.toLowerCase().includes(q) || e.note.toLowerCase().includes(q));
  }, [entries, filter]);

  function save() {
    const snap = snapshot({ intensity, temperature, area });
    setEntries(prev => addEntry(prev, title, note, parseTags(tagText), snap));
    setTitle("");
    setNote("");
    setTagText("");
  }

  function toggleCompare(id: string) {
    setCompareIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev.slice(-1), id]));
  }

  function exportAll() {
    const csv = toCsv(
      ["Title", "Saved", "Irradiance (W/m2)", "Temperature (C)", "Area (cm2)", "Isc (mA)", "Voc (V)", "Pmax (mW)", "FF", "Efficiency (%)", "Tags", "Note"],
      entries.map(e => [
        e.title,
        new Date(e.createdAt).toISOString(),
        e.params.intensity,
        e.params.temperature,
        e.params.area,
        e.results.Isc.toFixed(3),
        e.results.Voc.toFixed(4),
        e.results.Pmax.toFixed(3),
        e.results.FF.toFixed(4),
        e.results.efficiency.toFixed(3),
        e.tags.join(" "),
        e.note,
      ]),
    );
    downloadText("photon-lab-notebook.csv", csv);
  }

  const pair = compareIds.map(id => entries.find(e => e.id === id)).filter((e): e is NotebookEntry => Boolean(e));

  return (
    <section className="glass-strong rounded-2xl p-6 gradient-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-[var(--neon-cyan)]" /> Lab notebook
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportAll}
            disabled={entries.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete every saved run? This cannot be undone.")) {
                setEntries(clearEntries());
                setCompareIds([]);
              }
            }}
            disabled={entries.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg glass flex items-center gap-1.5 hover:text-[var(--neon-cyan)] transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Save the current settings and results as a run, add your own observations, and compare any two runs side by side.
        Everything stays in your browser.
      </p>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Run title (e.g. Noon, hot day)"
          className="glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]"
        />
        <input
          value={tagText}
          onChange={e => setTagText(e.target.value)}
          placeholder="Tags: summer, test, shaded"
          className="glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 focus:ring-[var(--neon-cyan)]"
        />
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="What did you notice?"
        rows={2}
        className="w-full mt-3 glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] resize-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <span className="text-xs text-muted-foreground">
          Will save: {intensity} W/m², {temperature} °C, {area} cm²
        </span>
        <button
          onClick={save}
          className="px-4 py-2 rounded-lg text-sm gradient-border text-[var(--neon-cyan)] flex items-center gap-1.5 hover:bg-[color-mix(in_oklab,var(--neon-cyan)_10%,transparent)] transition"
        >
          <Plus className="w-4 h-4" /> Save this run
        </button>
      </div>

      {ready && entries.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search runs or type a tag"
              className="glass rounded-lg px-3 py-1.5 text-sm bg-transparent outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] flex-1 min-w-[180px]"
            />
            {allTags.slice(0, 6).map(t => (
              <button
                key={t}
                onClick={() => setFilter(f => (f === t ? "" : t))}
                className={`text-xs px-2 py-1 rounded-full transition ${filter === t ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground"}`}
              >
                #{t}
              </button>
            ))}
          </div>

          {pair.length === 2 && <ComparePanel a={pair[0]} b={pair[1]} />}

          <ul className="mt-4 space-y-3">
            {visible.map(e => (
              <EntryCard
                key={e.id}
                entry={e}
                isBest={best?.id === e.id && entries.length > 1}
                selected={compareIds.includes(e.id)}
                onToggle={() => toggleCompare(e.id)}
                onDelete={() => setEntries(prev => removeEntry(prev, e.id))}
                onNote={text => setEntries(prev => updateNote(prev, e.id, text))}
              />
            ))}
            {visible.length === 0 && <li className="text-sm text-muted-foreground">No runs match that search.</li>}
          </ul>
        </div>
      )}

      {ready && entries.length === 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground glass rounded-xl py-8">
          Nothing saved yet. Set up your cell above and press “Save this run”.
        </div>
      )}
    </section>
  );
}

function EntryCard(props: {
  entry: NotebookEntry;
  isBest: boolean;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onNote: (text: string) => void;
}) {
  const { entry: e } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(e.note);

  return (
    <li className={`glass rounded-xl p-4 ${props.selected ? "ring-1 ring-[var(--neon-cyan)]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium text-sm flex items-center gap-2">
            {e.title}
            {props.isBest && (
              <span className="text-[10px] px-2 py-0.5 rounded-full gradient-border text-[var(--neon-cyan)] flex items-center gap-1">
                <Trophy className="w-3 h-3" /> best η
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {formatDate(e.createdAt)} · {e.params.intensity} W/m² · {e.params.temperature} °C
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={props.onToggle}
            className={`text-xs px-2.5 py-1 rounded-lg transition ${props.selected ? "gradient-border text-[var(--neon-cyan)]" : "glass text-muted-foreground hover:text-foreground"}`}
          >
            {props.selected ? "Selected" : "Compare"}
          </button>
          <button onClick={props.onDelete} aria-label="Delete run" className="text-xs px-2 py-1 rounded-lg glass text-muted-foreground hover:text-foreground">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-3 text-center">
        <Mini label="Isc" value={`${e.results.Isc.toFixed(1)} mA`} />
        <Mini label="Voc" value={`${e.results.Voc.toFixed(3)} V`} />
        <Mini label="Pmax" value={`${e.results.Pmax.toFixed(2)} mW`} />
        <Mini label="FF" value={e.results.FF.toFixed(3)} />
        <Mini label="η" value={`${e.results.efficiency.toFixed(2)}%`} />
      </div>

      {e.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {e.tags.map(t => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full glass text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}

      {editing ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={ev => setDraft(ev.target.value)}
            rows={2}
            className="w-full glass rounded-lg px-3 py-2 text-sm bg-transparent outline-none focus:ring-1 focus:ring-[var(--neon-cyan)] resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                props.onNote(draft.trim());
                setEditing(false);
              }}
              className="text-xs px-3 py-1 rounded-lg gradient-border text-[var(--neon-cyan)]"
            >
              Save note
            </button>
            <button
              onClick={() => {
                setDraft(e.note);
                setEditing(false);
              }}
              className="text-xs px-3 py-1 rounded-lg glass text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="block text-left mt-3 text-sm text-muted-foreground hover:text-foreground transition w-full">
          {e.note ? e.note : <span className="italic opacity-70">Add a note…</span>}
        </button>
      )}
    </li>
  );
}

function ComparePanel({ a, b }: { a: NotebookEntry; b: NotebookEntry }) {
  const rows: { label: string; av: number; bv: number; digits: number; unit: string }[] = [
    { label: "Irradiance", av: a.params.intensity, bv: b.params.intensity, digits: 0, unit: "W/m²" },
    { label: "Temperature", av: a.params.temperature, bv: b.params.temperature, digits: 0, unit: "°C" },
    { label: "Isc", av: a.results.Isc, bv: b.results.Isc, digits: 2, unit: "mA" },
    { label: "Voc", av: a.results.Voc, bv: b.results.Voc, digits: 3, unit: "V" },
    { label: "Pmax", av: a.results.Pmax, bv: b.results.Pmax, digits: 2, unit: "mW" },
    { label: "Fill factor", av: a.results.FF, bv: b.results.FF, digits: 3, unit: "" },
    { label: "Efficiency", av: a.results.efficiency, bv: b.results.efficiency, digits: 2, unit: "%" },
  ];
  return (
    <div className="mt-4 glass rounded-xl p-4 overflow-x-auto">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Side by side</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 pr-3 font-normal">Quantity</th>
            <th className="py-1 pr-3 font-normal">{a.title}</th>
            <th className="py-1 pr-3 font-normal">{b.title}</th>
            <th className="py-1 font-normal">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const diff = r.bv - r.av;
            const pct = r.av !== 0 ? (diff / Math.abs(r.av)) * 100 : 0;
            return (
              <tr key={r.label} className="border-t border-white/5">
                <td className="py-1.5 pr-3 text-muted-foreground">{r.label}</td>
                <td className="py-1.5 pr-3 tabular-nums">{r.av.toFixed(r.digits)} {r.unit}</td>
                <td className="py-1.5 pr-3 tabular-nums">{r.bv.toFixed(r.digits)} {r.unit}</td>
                <td className={`py-1.5 tabular-nums ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {diff > 0 ? "+" : ""}{pct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
