import { reactive } from '../../engine/reactivity.ts';

/**
 * Auth Scope: Provides reactive signals for authentication state.
 * Stub implementation for now.
 */
export const authScope = reactive({
  user: null as Record<string, unknown> | null,
  isAuthenticated: false,
  roles: [] as string[],
  token: null as string | null,

  // Methods to simulate login/logout for now
  login: (userData: Record<string, unknown>) => {
    authScope.user = userData;
    authScope.isAuthenticated = true;
    authScope.roles = (userData.roles as string[]) || [];
  },
  logout: () => {
    authScope.user = null;
    authScope.isAuthenticated = false;
    authScope.roles = [];
    authScope.token = null;
  }
});

export const scopeRule = (q: string, body: () => any) => {
  if (q === 'isAuthenticated') return authScope.isAuthenticated ? body() : undefined;
  if (authScope.roles.includes(q)) return body() ? body() : undefined;
  return undefined;
};
