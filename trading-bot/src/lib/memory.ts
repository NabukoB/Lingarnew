import { readFile } from "fs/promises";
import path from "path";

const MEMORY_DIR = path.join(process.cwd(), "memory");

async function safeRead(file: string): Promise<string | null> {
  try {
    return await readFile(path.join(MEMORY_DIR, file), "utf8");
  } catch {
    return null;
  }
}

export async function readResearchLog(): Promise<{
  raw: string | null;
  latest: string | null;
  latestDate: string | null;
}> {
  const raw = await safeRead("RESEARCH-LOG.md");
  if (!raw) return { raw: null, latest: null, latestDate: null };
  const dateSections = raw.split(/\n(?=## \d{4}-\d{2}-\d{2})/);
  const dated = dateSections.filter((s) =>
    /^## \d{4}-\d{2}-\d{2}/.test(s.trim())
  );
  const tail = dated.at(-1);
  const latest = tail ? tail.trim() : null;
  const latestDate = latest?.match(/^## (\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  return { raw, latest, latestDate };
}

export async function readTradeLogTail(maxChars = 3000): Promise<string | null> {
  const raw = await safeRead("TRADE-LOG.md");
  if (!raw) return null;
  if (raw.length <= maxChars) return raw;
  const tail = raw.slice(raw.length - maxChars);
  const firstBreak = tail.indexOf("\n### ");
  return firstBreak >= 0 ? tail.slice(firstBreak + 1) : tail;
}
