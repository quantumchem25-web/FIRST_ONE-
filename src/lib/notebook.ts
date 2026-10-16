// Lab notebook: saves experiment snapshots in the browser (localStorage).
import { computeCell, type CellParams } from "./physics";

const KEY = "photon-lab:notebook:v1";

export interface NotebookEntry {
  id: string;
  title: string;
  note: string;
  createdAt: number;
  params: { intensity: number; temperature: number; area: number; cells: number; mode: "single" | "series" | "parallel" };
  results: {
    Isc: number; // mA
    Voc: number; // V
    Pmax: number; // mW
    Vmp: number;
    Imp: number; // mA
    FF: number;
    efficiency: number;
  };
  tags: string[];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function loadEntries(): NotebookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotebookEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: NotebookEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage may be full or blocked; ignore */
  }
}

export function snapshot(params: Required<Pick<CellParams, "intensity" | "temperature">> & { area?: number; cells?: number; mode?: "single" | "series" | "parallel" }) {
  const area = params.area ?? 4;
  const cells = params.cells ?? 1;
  const mode = params.mode ?? "single";
  const r = computeCell({ intensity: params.intensity, temperature: params.temperature, area, cells, mode });
  return {
    params: { intensity: params.intensity, temperature: params.temperature, area, cells, mode },
    results: {
      Isc: r.Isc * 1000,
      Voc: r.Voc,
      Pmax: r.Pmax * 1000,
      Vmp: r.Vmp,
      Imp: r.Imp * 1000,
      FF: r.FF,
      efficiency: r.efficiency,
    },
  };
}

export function addEntry(entries: NotebookEntry[], title: string, note: string, tags: string[], snap: ReturnType<typeof snapshot>): NotebookEntry[] {
  const entry: NotebookEntry = {
    id: uid(),
    title: title.trim() || `Run ${entries.length + 1}`,
    note: note.trim(),
    createdAt: Date.now(),
    tags,
    ...snap,
  };
  const next = [entry, ...entries];
  persist(next);
  return next;
}

export function removeEntry(entries: NotebookEntry[], id: string): NotebookEntry[] {
  const next = entries.filter(e => e.id !== id);
  persist(next);
  return next;
}

export function updateNote(entries: NotebookEntry[], id: string, note: string): NotebookEntry[] {
  const next = entries.map(e => (e.id === id ? { ...e, note } : e));
  persist(next);
  return next;
}

export function clearEntries(): NotebookEntry[] {
  persist([]);
  return [];
}

export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s]+/)
        .map(t => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

export function bestEntry(entries: NotebookEntry[]): NotebookEntry | undefined {
  return entries.reduce<NotebookEntry | undefined>((best, e) => (!best || e.results.efficiency > best.results.efficiency ? e : best), undefined);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
