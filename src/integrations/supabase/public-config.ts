// Public project connection details, safe to include in the browser bundle.
// Access to data is enforced by Supabase Auth and row-level security.
const DEFAULT_URL = 'https://afzyivlffdrdiqrrimeu.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_ljOzBP6PS-GCKy7tSrbGkQ_FInnnUYJ';

export function resolvePublicSupabaseConfig(url?: string, key?: string) {
  if (!url && !key) return { url: DEFAULT_URL, key: DEFAULT_PUBLISHABLE_KEY };
  if (!url || !key) throw new Error('Set both the Supabase URL and publishable key when overriding the project.');
  return { url, key };
}
