import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGate } from './AuthGate';
const state = vi.hoisted(() => ({ path: '/projects', auth: {} as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => state.path,
  Navigate: ({ to }: { to: string }) => <span>redirect:{to}</span>,
}));
const render = () => renderToStaticMarkup(<AuthGate><div>PRIVATE CONTENT</div></AuthGate>);
beforeEach(() => {
  state.path = '/projects';
  state.auth = { loading: false, user: null, profile: null };
});
describe('protected pages', () => {
  it('does not render protected children while loading', () => {
    state.auth.loading = true;
    expect(render()).not.toContain('PRIVATE CONTENT');
  });
  it('redirects signed-out visitors', () => {
    expect(render()).toContain('redirect:/login');
    expect(render()).not.toContain('PRIVATE CONTENT');
  });
  it.each(['/', '/login', '/signup'])('keeps %s public', (path) => {
    state.path = path;
    expect(render()).toContain('PRIVATE CONTENT');
  });
  it('blocks when profile loading fails', () => {
    state.auth.user = { id: 'a' };
    state.auth.profileError = true;
    expect(render()).toContain('Try again');
    expect(render()).not.toContain('PRIVATE CONTENT');
  });
  it('requires onboarding but permits the onboarding page', () => {
    state.auth.user = { id: 'a' };
    state.auth.profile = { onboarded: false };
    expect(render()).toContain('redirect:/onboarding');
    state.path = '/onboarding';
    expect(render()).toContain('PRIVATE CONTENT');
  });
  it('permits signed-in users with a loaded profile', () => {
    state.auth.user = { id: 'a' };
    state.auth.profile = { onboarded: true };
    expect(render()).toContain('PRIVATE CONTENT');
  });
  it('blocks non-admin users from admin pages', () => {
    state.path = '/admin';
    state.auth.user = { id: 'a' };
    state.auth.profile = { onboarded: true, is_platform_admin: false };
    expect(render()).not.toContain('PRIVATE CONTENT');
    state.auth.profile = { onboarded: true, is_platform_admin: true };
    expect(render()).toContain('PRIVATE CONTENT');
  });
});
