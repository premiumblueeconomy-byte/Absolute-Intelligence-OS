import { describe, expect, it } from 'vitest';
import { resolvePublicSupabaseConfig } from './public-config';

describe('public Supabase configuration', () => {
  it('starts against the selected project without deployment environment variables', () => {
    const config = resolvePublicSupabaseConfig();
    expect(config.url).toBe('https://afzyivlffdrdiqrrimeu.supabase.co');
    expect(config.key).toMatch(/^sb_publishable_/);
  });
  it('allows a complete environment override', () => {
    expect(resolvePublicSupabaseConfig('https://example.supabase.co', 'sb_publishable_test'))
      .toEqual({ url: 'https://example.supabase.co', key: 'sb_publishable_test' });
  });
  it('rejects a partial override instead of mixing projects', () => {
    expect(() => resolvePublicSupabaseConfig('https://example.supabase.co')).toThrow('both');
    expect(() => resolvePublicSupabaseConfig(undefined, 'sb_publishable_test')).toThrow('both');
  });
});
