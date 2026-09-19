import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resolvePublicSupabaseConfig } from './public-config';

const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = resolvePublicSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

