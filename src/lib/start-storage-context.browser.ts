/**
 * Browser stub for `@tanstack/start-storage-context`.
 *
 * `src/start.ts` imports `createStart`/`createMiddleware` from
 * `@tanstack/start-client-core` (the public `@tanstack/react-start` entry makes
 * the production bundler emit a circular server chunk pair — "Export
 * 'ssr_exports' is not defined" — and every deployed request 500s).
 *
 * That internal entry pulls `@tanstack/start-storage-context`, whose module
 * body does `new AsyncLocalStorage()` from `node:async_hooks`. In the browser
 * that import is externalised to a warning proxy, so the app crashed at module
 * init with "AsyncLocalStorage is not a constructor" and nothing rendered.
 *
 * The start context only ever exists on the server, so the client build aliases
 * that package to this stub (see `vite.config.ts`).
 */

export function getStartContext(opts?: { throwIfNotFound?: boolean }): never | undefined {
  if (opts?.throwIfNotFound === false) return undefined;
  throw new Error("Start context is server-only and is not available in the browser.");
}

export async function runWithStartContext<T>(_context: unknown, fn: () => T): Promise<T> {
  return fn();
}
