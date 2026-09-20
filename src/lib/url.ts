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

/**
 * Join a site base path and a static file, with no trailing slash — a
 * file is not a directory, and `favicon.svg/` does not exist.
 */
export function joinFile(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${trimmedBase}/${path.replace(/^\/+/, '')}`;
}

/** Resolve an internal route against the configured base path. */
export function url(path: string): string {
  return joinPath(import.meta.env.BASE_URL, path);
}

/** Resolve a file in `public/` against the configured base path. */
export function asset(path: string): string {
  return joinFile(import.meta.env.BASE_URL, path);
}
