// Deployment diagnostics — visit /api/health directly in a browser (no
// Vercel dashboard navigation needed). Reports only whether each required
// env var is present (true/false), never the actual value, so it's safe to
// leave deployed. This is a separate, standalone function from api/index.js
// — it does not import dist/server/server.js, so it keeps working even if
// that handler is completely broken (e.g. crashing at import time), which
// is exactly the situation it's meant to help diagnose.
export default function handler(req, res) {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({
    ok: true,
    env: {
      VITE_SUPABASE_URL: Boolean(process.env.VITE_SUPABASE_URL),
      VITE_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    note: "true means the variable is set (non-empty) in this deployment; false means it's missing. Values themselves are never shown here.",
  }, null, 2));
}
