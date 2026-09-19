import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOpportunityFromMessage } from './conversations';
import type { AgentOutput } from './ask-absolute';
const mocks = vi.hoisted(() => ({ project: vi.fn(), opportunities: vi.fn(), assumptions: vi.fn(), unknowns: vi.fn(), claims: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/projects', () => ({ createProject: mocks.project }));
vi.mock('@/lib/opportunities', () => ({ persistOpportunities: mocks.opportunities, persistAssumptions: mocks.assumptions, persistUnknowns: mocks.unknowns, persistClaims: mocks.claims }));
const result = { opportunities: [{ title: 'PE/PP recycling', summary: 'Recover clean polymers' }], confidence: 50, assumptions: [], unknowns: [], claims: [] } as unknown as AgentOutput;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.project.mockResolvedValue({ id: 'new-project' });
  mocks.opportunities.mockResolvedValue([{ id: 'new-opportunity' }]);
});
describe('Create Opportunity', () => {
  it('creates a project automatically when no project is selected', async () => {
    const saved = await saveOpportunityFromMessage({ result, opportunityIndex: 0 });
    expect(mocks.project).toHaveBeenCalledWith({ title: 'PE/PP recycling', objective: 'Recover clean polymers' });
    expect(mocks.opportunities).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'new-project' }));
    expect(saved).toEqual({ projectId: 'new-project', opportunityId: 'new-opportunity' });
  });
  it('uses an existing selected project', async () => {
    await saveOpportunityFromMessage({ projectId: 'existing', result, opportunityIndex: 0 });
    expect(mocks.project).not.toHaveBeenCalled();
    expect(mocks.opportunities).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'existing' }));
    expect(mocks.claims).toHaveBeenCalledWith('existing', 'new-opportunity', []);
  });
  it('rejects an invalid selection before creating a project', async () => {
    await expect(saveOpportunityFromMessage({ result, opportunityIndex: 99 })).rejects.toThrow('No such opportunity');
    expect(mocks.project).not.toHaveBeenCalled();
  });
  it('does not create an opportunity when project creation fails', async () => {
    mocks.project.mockRejectedValue(new Error('Permission denied'));
    await expect(saveOpportunityFromMessage({ result, opportunityIndex: 0 })).rejects.toThrow('Permission denied');
    expect(mocks.opportunities).not.toHaveBeenCalled();
  });
});
