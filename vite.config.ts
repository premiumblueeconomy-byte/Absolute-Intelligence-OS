import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load all env vars (including non-VITE_ server secrets) into process.env so
// server routes can read them. These are NOT exposed to the client bundle.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, { ...serverEnv, ...process.env });

/**
 * Client-only redirect for `@tanstack/start-storage-context`.
 *
 * `src/start.ts` must import the framework internals from
 * `@tanstack/start-client-core` (the public entry makes the production bundler
 * emit a circular server chunk pair and every deployed request 500s). That
 * internal entry drags in start-storage-context, which constructs a Node
 * `AsyncLocalStorage` at module scope — in the browser that throws and the app
 * never mounts. The start context is server-only, so the browser gets a stub.
 */
function browserStartStorageStub() {
  const stub = path.resolve(__dirname, "src/lib/start-storage-context.browser.ts");
  return {
    name: "browser-start-storage-stub",
    enforce: "pre" as const,
    resolveId(this: { environment?: { name?: string } }, source: string) {
      if (source !== "@tanstack/start-storage-context") return null;
      return this.environment?.name === "client" ? stub : null;
    },
  };
}

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    browserStartStorageStub(),
  ],
  optimizeDeps: {
    // Must go through the plugin above instead of being pre-bundled as-is.
    exclude: ["@tanstack/start-storage-context"],
  },
  server: {
    host: "127.0.0.1",
  },
});
