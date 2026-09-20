/**
 * Join a site base path and an internal route, always producing a
 * trailing slash. The site is served from a sub-path on GitHub Pages,
 * so no internal link may be written as a bare absolute path.
 */
export function joinPath(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmedPath === '') return `${trimmedBase}/`;
  return `${trimmedBase}/${trimmedPath}/`;
}

/** Resolve an internal route against the configured base path. */
export function url(path: string): string {
  return joinPath(import.meta.env.BASE_URL, path);
}
