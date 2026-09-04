import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" },
      { name: "theme-color", content: "#0f1520" },
      { title: "Absolute Intelligence OS" },
      {
        name: "description",
        content:
          "Discover Reality. Connect Knowledge. Unlock Opportunity. Execute Better. Give AIOS a resource, problem, technology, market or idea and it reveals structured, evidence-graded opportunities and what to do next.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" />
      <LanguageProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground">That page doesn't exist.</p>
        <a href="/" className="inline-flex px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
          Go home
        </a>
      </div>
    </div>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold">This page didn't load</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong on our end. You can try again or head back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a href="/" className="px-4 py-2 rounded-md border border-border text-sm font-semibold">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
