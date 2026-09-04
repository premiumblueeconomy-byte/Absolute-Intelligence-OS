// Imported from start-client-core (not @tanstack/react-start): importing the
// React wrapper here makes the production bundler split the framework server
// module into a circular chunk pair ("Export 'ssr_exports' is not defined"),
// so every request of the deployed site returns HTTP 500.
//
// The trade-off is that this internal entry also drags
// `@tanstack/start-storage-context` (which constructs a Node AsyncLocalStorage
// at module scope) into the browser bundle. The client build aliases that
// package to `src/lib/start-storage-context.browser.ts` — see vite.config.ts.
import { createStart, createMiddleware } from "@tanstack/start-client-core";

// `renderErrorPage` is imported lazily inside the catch: a static import here
// puts the app graph into the framework's server entry chunk and the bundler
// emits a circular chunk pair ("Export 'ssr_exports' is not defined"), which
// makes every deployed request fail.

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    const { renderErrorPage } = await import("./lib/error-page");
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Hand-rolled CSRF guard for server functions.
//
// The framework helper `createCsrfMiddleware` is not resolvable in every
// production bundle of the current toolchain and crashes the server at startup
// ("createCsrfMiddleware is not a function"), taking the whole site down. This
// same-origin check is equivalent and has no such dependency.
const csrfMiddleware = createMiddleware().server(async (ctx) => {
  const { next, request } = ctx;
  const handlerType = (ctx as { handlerType?: string }).handlerType;
  const method = request.method.toUpperCase();

  if (handlerType === "serverFn" && method !== "GET" && method !== "HEAD") {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return new Response("Cross-site request blocked", { status: 403 });
    }
    const origin = request.headers.get("origin");
    if (origin) {
      let allowed = false;
      try {
        allowed = new URL(origin).origin === new URL(request.url).origin;
      } catch {
        allowed = false;
      }
      if (!allowed) {
        return new Response("Cross-site request blocked", { status: 403 });
      }
    }
  }

  return next();
});

// Attaches the Supabase bearer token to every server-function call so that
// `requireSupabaseAuth` handlers can identify the caller. Defined locally (not
// imported from the generated attacher) so `src/start.ts` keeps importing only
// `@tanstack/start-client-core` — see the note above.
const attachAuthMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        return next({ headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      /* no session available */
    }
    return next();
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [attachAuthMiddleware],
}));
