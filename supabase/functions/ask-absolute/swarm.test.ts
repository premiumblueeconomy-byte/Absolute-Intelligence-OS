import { describe, expect, it, vi } from 'vitest';
import { runSwarm, type ModelCall } from './swarm';
const brief = { summary: 'Independent assessment', findings: [], candidates: ['Pilot'], risks: [], evidence_gaps: [] };
const review = { disagreements: ['Price evidence missing'], rejected_ideas: [], required_corrections: [], validation_priorities: [] };
const result = { summary: 'Synthesis', findings: [], claims: [{ statement: 'Model claim', claim_type: 'inference', confidence: 50, status: 'verified' }], evidence_needed: [], assumptions: [], unknowns: [], risks: [], opportunities: [], recommendations: [], confidence: 50, next_actions: [] };
describe('swarm orchestration', () => {
  it('starts specialists together, then passes their findings to critic and integrator', async () => {
    const pending: Array<(value: unknown) => void> = [];
    const roles: string[] = [];
    const call: ModelCall = vi.fn(async (role, _system, input) => {
      roles.push(role);
      if (['discovery','market','evidence'].includes(role)) return new Promise(resolve => pending.push(resolve));
      expect(input).toContain('Independent assessment');
      if (role === 'critic') return review;
      expect(input).toContain('Price evidence missing');
      return result;
    });
    const running = runSwarm('request', 'contract', call);
    expect(roles).toEqual(['discovery', 'market', 'evidence']);
    pending.forEach(resolve => resolve(brief));
    const output = await running;
    expect(roles).toEqual(['discovery','market','evidence','critic','integrator']);
    expect(output.swarm.agents).toHaveLength(5);
    expect(output.claims[0].status).toBe('needs_validation');
  });
  it('does not synthesize a failed specialist analysis', async () => {
    const call = vi.fn(async () => { throw new Error('Provider unavailable'); });
    await expect(runSwarm('request','contract',call)).rejects.toThrow('Provider unavailable');
    expect(call).toHaveBeenCalledTimes(3);
  });
  it('rejects malformed final output', async () => {
    const call: ModelCall = async role => role === 'critic' ? review : role === 'integrator' ? { ...result, confidence: 150 } : brief;
    await expect(runSwarm('request','contract',call)).rejects.toThrow();
  });
  it('requires the critical review before producing a result', async () => {
    const roles: string[] = [];
    const call: ModelCall = async role => { roles.push(role); return role === 'critic' ? {} : brief; };
    await expect(runSwarm('request','contract',call)).rejects.toThrow();
    expect(roles).not.toContain('integrator');
  });
});
