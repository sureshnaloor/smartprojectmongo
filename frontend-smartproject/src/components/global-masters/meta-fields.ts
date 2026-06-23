/** Encode extra master fields in remarks without breaking free-text notes. */
const META_PREFIX = "@gm:";

export function encodeMeta(
  remarks: string | undefined | null,
  meta: Record<string, string | undefined>
): string {
  const clean = stripMeta(remarks);
  const pairs = Object.entries(meta)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  if (pairs.length === 0) return clean;
  return `${META_PREFIX}${pairs.join("|")}${clean ? ` ${clean}` : ""}`;
}

export function parseMeta(remarks: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!remarks?.startsWith(META_PREFIX)) return out;
  const rest = remarks.slice(META_PREFIX.length);
  const pipeEnd = rest.indexOf(" ");
  const block = pipeEnd === -1 ? rest : rest.slice(0, pipeEnd);
  for (const part of block.split("|")) {
    const eq = part.indexOf("=");
    if (eq > 0) out[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return out;
}

export function stripMeta(remarks: string | undefined | null): string {
  if (!remarks?.startsWith(META_PREFIX)) return remarks?.trim() ?? "";
  const rest = remarks.slice(META_PREFIX.length);
  const pipeEnd = rest.indexOf(" ");
  return pipeEnd === -1 ? "" : rest.slice(pipeEnd + 1).trim();
}

export function displayStatus(meta: Record<string, string>, fallback = "active"): string {
  return meta.status ?? fallback;
}
