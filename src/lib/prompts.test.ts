import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractPlaceholders, fillTemplate, filterPrompts, listPromptTemplates, type PromptTemplate } from './prompts';

const api = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), gt: vi.fn(), order: vi.fn(), limit: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: api.from } }));
const prompt = (n: number, category = 'Blue Economy & Aquaculture', template = 'Reveal overlooked value in [SUBJECT] within [LOCATION].') =>
  ({ id: String(n), prompt_number: n, category, template, workflow: ['integrator_agent'], created_at: '' }) as PromptTemplate;

beforeEach(() => {
  vi.resetAllMocks();
  api.from.mockReturnValue(api);
  api.select.mockReturnValue(api);
  api.gt.mockReturnValue(api);
  api.order.mockReturnValue(api);
});

describe('large prompt library', () => {
  it('loads all 1,000 prompts even if the API caps responses below the requested limit', async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => prompt(i + 1));
    let after = 0;
    api.gt.mockImplementation((_column, cursor) => { after = cursor; return api; });
    api.limit.mockImplementation(async () => ({ data: rows.filter((p) => p.prompt_number > after).slice(0, 100), error: null }));
    const loaded = await listPromptTemplates();
    expect(loaded).toEqual(rows);
    expect(new Set(loaded.map((p) => p.id)).size).toBe(1000);
  });
  it('reports a failed later page instead of returning a silently truncated library', async () => {
    api.limit.mockResolvedValueOnce({ data: [prompt(1)], error: null }).mockResolvedValueOnce({ data: null, error: new Error('Offline') });
    await expect(listPromptTemplates()).rejects.toThrow('Offline');
  });
  it('searches exact prompt numbers including the final entry', () => {
    expect(filterPrompts([prompt(1), prompt(100), prompt(1000)], '#1000', '').map((p) => p.prompt_number)).toEqual([1000]);
  });
  it('combines category and case-insensitive search terms, including no matches', () => {
    const rows = [prompt(51, 'Agriculture & Food Systems', 'Uncover soil value'), prompt(101, 'Blue Economy & Aquaculture', 'Uncover seaweed value')];
    expect(filterPrompts(rows, 'BLUE seaweed', 'Blue Economy & Aquaculture')).toEqual([rows[1]]);
    expect(filterPrompts(rows, 'soil', 'Blue Economy & Aquaculture')).toEqual([]);
    expect(filterPrompts(rows, '   ', '')).toEqual(rows);
  });
  it('fills every repeated field in a new sector prompt', () => {
    const template = 'Analyze [SUBJECT] in [LOCATION]. Challenge assumptions about [SUBJECT].';
    expect(extractPlaceholders(template)).toEqual(['SUBJECT', 'LOCATION']);
    expect(fillTemplate(template, { SUBJECT: 'seaweed', LOCATION: 'Lagos' })).toBe('Analyze seaweed in Lagos. Challenge assumptions about seaweed.');
  });
});

