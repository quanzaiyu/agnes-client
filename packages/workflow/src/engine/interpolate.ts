/**
 * Variable interpolation: replace ${varName} in a string with values.
 * Supports ${varName} and ${varName:-default} (default if missing/empty).
 */
export function interpolate(text: string, vars: Record<string, string | undefined>): string {
  if (!text) return text;
  return text.replace(/\$\{([a-zA-Z_][\w\-]*)(?::-([^}]*))?\}/g, (_m, name, def) => {
    const v = vars[name];
    if (v === undefined || v === '') return def ?? '';
    return v;
  });
}

/** Find all ${varName} references in a string. */
export function findVarRefs(text: string): string[] {
  if (!text) return [];
  const refs = new Set<string>();
  const re = /\$\{([a-zA-Z_][\w\-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) refs.add(m[1]);
  return [...refs];
}
