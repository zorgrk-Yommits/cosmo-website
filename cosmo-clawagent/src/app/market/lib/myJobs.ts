// "My jobs" — browser-local memory of jobs the user posted, so nobody has to
// memorize a job id. localStorage only; nothing here is authoritative, the
// market API remains the source of truth. All access is fail-silent (private
// mode, quota, SSR) — a missing panel is fine, a crash is not.

export interface MyJobEntry {
  id: string;
  title: string;
  createdAt: number; // ms epoch
}

const KEY = 'cosmo.market.myJobs.v1';
const MAX_ENTRIES = 20;

function isEntry(v: unknown): v is MyJobEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.title === 'string' && typeof e.createdAt === 'number';
}

export function getMyJobs(): MyJobEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

export function addMyJob(entry: MyJobEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const rest = getMyJobs().filter((e) => e.id !== entry.id);
    const next = [entry, ...rest].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — silently skip; the redirect still works
  }
}
