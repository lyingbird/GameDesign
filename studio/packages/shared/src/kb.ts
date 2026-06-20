// Knowledge-base loader. Reads the markdown KB under packages/shared/kb/ (built
// by the KB agents) into typed, queryable entries the harness injects per node.
// Server-only (uses fs). See spec §6b.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const HERE = dirname(fileURLToPath(import.meta.url));
export const KB_ROOT = join(HERE, "..", "kb");

export interface KbEntry {
  id: string;
  kind: "node" | "methodology" | "genre" | "gdd-schema";
  /** frontmatter, verbatim */
  meta: Record<string, unknown>;
  body: string;
  path: string;
}

// Non-content markdown that may sit alongside KB cards (indexes, agent docs).
// These are NOT knowledge entries and must never be injected into prompts.
const META_FILES = new Set(["readme.md", "agents.md"]);

function loadDir(kind: KbEntry["kind"], subdir: string): KbEntry[] {
  const dir = join(KB_ROOT, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !META_FILES.has(f.toLowerCase()))
    .map((f) => {
      const full = join(dir, f);
      const parsed = matter(readFileSync(full, "utf8"));
      const meta = parsed.data ?? {};
      return {
        id: String(meta.id ?? f.replace(/\.md$/, "")),
        kind,
        meta,
        body: parsed.content,
        path: full,
      };
    });
}

export interface Kb {
  nodes: KbEntry[];
  methodology: KbEntry[];
  genres: KbEntry[];
  gddSchema: KbEntry[];
}

let cache: Kb | null = null;
export function loadKb(force = false): Kb {
  if (cache && !force) return cache;
  cache = {
    nodes: loadDir("node", "nodes"),
    methodology: loadDir("methodology", "methodology"),
    genres: loadDir("genre", "genres"),
    gddSchema: loadDir("gdd-schema", "gdd-schema"),
  };
  return cache;
}

/** Node KB entry for a node id (matches frontmatter `id`). */
export function nodeCard(kb: Kb, nodeId: string): KbEntry | undefined {
  return kb.nodes.find((e) => e.id === nodeId);
}

/** Methodology cards whose `applies_to_nodes` includes this node. */
export function methodologyFor(kb: Kb, nodeId: string): KbEntry[] {
  return kb.methodology.filter((e) => {
    const a = e.meta.applies_to_nodes;
    return Array.isArray(a) && (a as unknown[]).includes(nodeId);
  });
}

/** Match a user's stated genre/keyword to a genre card via id + aliases. */
export function matchGenre(kb: Kb, text: string): KbEntry | undefined {
  const t = text.toLowerCase();
  return kb.genres.find((e) => {
    if (t.includes(e.id.toLowerCase())) return true;
    const aliases = (e.meta.aliases as unknown[] | undefined) ?? [];
    return aliases.some((a) => typeof a === "string" && t.includes(a.toLowerCase()));
  });
}
