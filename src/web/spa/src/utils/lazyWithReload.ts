import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * `React.lazy()` wrapper that recovers from stale-chunk errors after a deploy.
 * The CI pipeline `aws s3 sync --delete`s old assets, so a browser holding an
 * older index.html with stale chunk hashes will hit a 404 on first navigation
 * to a code-split route. Detect that, force a single page reload to pick up
 * the new index.html, and retry. Reload-loops are guarded by a query sentinel.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkError && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("_chunk_reload")) {
          url.searchParams.set("_chunk_reload", "1");
          window.location.replace(url.toString());
          /* Suspend forever; the navigation supersedes any rendered fallback. */
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }),
  );
}
