import { describe, expect, it } from 'vitest';
import { joinFile, joinPath } from '../src/lib/url';

describe('joinPath', () => {
  it('joins a base path and a route with a trailing slash', () => {
    expect(joinPath('/electro-kit-site/', '/parts')).toBe('/electro-kit-site/parts/');
  });

  it('accepts a base without a trailing slash', () => {
    expect(joinPath('/electro-kit-site', 'parts')).toBe('/electro-kit-site/parts/');
  });

  it('returns the base itself for the site root', () => {
    expect(joinPath('/electro-kit-site/', '/')).toBe('/electro-kit-site/');
    expect(joinPath('/electro-kit-site/', '')).toBe('/electro-kit-site/');
  });

  it('handles a root base path', () => {
    expect(joinPath('/', '/parts/')).toBe('/parts/');
    expect(joinPath('/', '/')).toBe('/');
  });

  it('does not duplicate a trailing slash already on the path', () => {
    expect(joinPath('/electro-kit-site/', '/experiments/morse/')).toBe(
      '/electro-kit-site/experiments/morse/',
    );
  });

  it('keeps nested routes intact', () => {
    expect(joinPath('/electro-kit-site/', 'chapters/magnetism')).toBe(
      '/electro-kit-site/chapters/magnetism/',
    );
  });
});

describe('joinFile', () => {
  it('does not turn a file into a directory', () => {
    expect(joinFile('/electro-kit-site/', '/favicon.svg')).toBe(
      '/electro-kit-site/favicon.svg',
    );
  });

  it('accepts a base without a trailing slash', () => {
    expect(joinFile('/electro-kit-site', 'favicon.svg')).toBe(
      '/electro-kit-site/favicon.svg',
    );
  });

  it('handles a root base path', () => {
    expect(joinFile('/', '/favicon.svg')).toBe('/favicon.svg');
  });
});
