import { reactive } from '../../engine/reactivity.ts';
import { registerScopeProvider } from '../../engine/scope.ts';
import type { ScopeModule } from '../../engine/modules.ts';

export interface AuthCredentials {
  user: string;
  pass: string;
  ns?: string;
  db?: string;
}

export interface AuthIdentityPayload {
  authenticated: boolean;
  actor: string | null;
  level: string;
  ns?: string;
  db?: string;
  roles: string[];
  capabilities: string[];
}

function dispatchAuthChanged(authenticated: boolean, actor: string | null): void {
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('nexus:auth-changed', {
        detail: { authenticated, actor }
      })
    );
  }
}

/**
 * Auth Scope (`$auth` / `@auth`):
 * Hydrates reactive UI identity, roles, and effective capabilities from a verified
 * server endpoint (`GET /_nexus/auth/me` by default) and coordinates cookie-backed
 * `POST /signin` / `POST /signout` flows.
 *
 * Security invariant: Frontend `@auth` / `$auth` is strictly for UI presentation.
 * All authorization MUST be enforced server-side (Nexus-IO IAM + Nexus-DB RBAC).
 */
export const authScope = reactive({
  user: null as Record<string, unknown> | null,
  actor: null as string | null,
  level: 'anonymous' as string,
  isAuthenticated: false,
  roles: [] as string[],
  capabilities: [] as string[],
  token: null as string | null,
  loading: false,
  hydrated: false,
  initialized: true,
  error: null as string | null,
  endpoint: '/_nexus/auth/me',
  setupStatusEndpoint: '/_nexus/setup/status',
  bootstrapEndpoint: '/_nexus/setup/bootstrap',
  signinEndpoint: '/signin',
  signoutEndpoint: '/signout',

  hasRole: (role: string): boolean => {
    const target = String(role || '').trim().toUpperCase();
    if (!target) return false;
    return (authScope.roles || []).some((r: string) => String(r).toUpperCase() === target);
  },

  can: (capability: string): boolean => {
    const target = String(capability || '').trim().toLowerCase();
    if (!target) return false;
    return (authScope.capabilities || []).some((c: string) => String(c).toLowerCase() === target);
  },

  refresh: async (): Promise<AuthIdentityPayload | null> => {
    if (typeof fetch !== 'function') {
      authScope.hydrated = true;
      return null;
    }
    authScope.loading = true;
    try {
      const res = await fetch(authScope.endpoint, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        authScope.user = null;
        authScope.actor = null;
        authScope.level = 'anonymous';
        authScope.isAuthenticated = false;
        authScope.roles = [];
        authScope.capabilities = [];
        authScope.hydrated = true;
        return null;
      }
      const data = (await res.json()) as Partial<AuthIdentityPayload>;
      if (data && data.authenticated) {
        const roles = Array.isArray(data.roles) ? data.roles.map(String) : [];
        const capabilities = Array.isArray(data.capabilities) ? data.capabilities.map(String) : [];
        const actor = data.actor ? String(data.actor) : null;
        const level = data.level ? String(data.level) : 'database';
        authScope.actor = actor;
        authScope.level = level;
        authScope.roles = roles;
        authScope.capabilities = capabilities;
        authScope.isAuthenticated = true;
        authScope.user = {
          actor,
          name: actor,
          level,
          ns: data.ns || 'nexus',
          db: data.db || 'system',
          roles,
          capabilities
        };
        authScope.error = null;
        authScope.hydrated = true;
        return {
          authenticated: true,
          actor,
          level,
          ns: data.ns,
          db: data.db,
          roles,
          capabilities
        };
      }
      authScope.user = null;
      authScope.actor = null;
      authScope.level = 'anonymous';
      authScope.isAuthenticated = false;
      authScope.roles = [];
      authScope.capabilities = [];
      try {
        const setupRes = await fetch(authScope.setupStatusEndpoint, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' }
        });
        if (setupRes.ok) {
          const setupData = await setupRes.json().catch(() => ({}));
          if (typeof setupData?.initialized === 'boolean') {
            authScope.initialized = setupData.initialized;
          }
        }
      } catch {
        // Ignore if backend does not expose setup status
      }
      authScope.hydrated = true;
      return {
        authenticated: false,
        actor: null,
        level: 'anonymous',
        roles: [],
        capabilities: []
      };
    } catch {
      authScope.user = null;
      authScope.actor = null;
      authScope.level = 'anonymous';
      authScope.isAuthenticated = false;
      authScope.roles = [];
      authScope.capabilities = [];
      authScope.hydrated = true;
      return null;
    } finally {
      authScope.loading = false;
    }
  },

  bootstrap: async (credentials: AuthCredentials): Promise<boolean> => {
    if (typeof fetch !== 'function') return false;
    authScope.loading = true;
    authScope.error = null;
    try {
      const payload = {
        user: (credentials?.user || '').trim(),
        pass: credentials?.pass || ''
      };
      if (!payload.user || payload.pass.length < 4) {
        authScope.error = 'Username and password (min 4 chars) are required';
        return false;
      }
      const res = await fetch(authScope.bootstrapEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        authScope.error = body?.details || `Setup failed (${res.status})`;
        return false;
      }
      authScope.initialized = true;
      const identity = await authScope.refresh();
      const ok = Boolean(identity?.authenticated);
      if (ok) {
        dispatchAuthChanged(true, authScope.actor);
      }
      return ok;
    } catch (err) {
      authScope.error = err instanceof Error ? err.message : 'Network error during setup';
      return false;
    } finally {
      authScope.loading = false;
    }
  },

  signin: async (credentials: AuthCredentials): Promise<boolean> => {
    if (typeof fetch !== 'function') return false;
    authScope.loading = true;
    authScope.error = null;
    try {
      const payload = {
        user: (credentials?.user || '').trim(),
        pass: credentials?.pass || '',
        ns: credentials?.ns || 'nexus',
        db: credentials?.db || 'system'
      };
      if (!payload.user || !payload.pass) {
        authScope.error = 'Username and password are required';
        return false;
      }
      const res = await fetch(authScope.signinEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        authScope.error = body?.details || `Sign-in failed (${res.status})`;
        return false;
      }
      // Server sets HttpOnly nexus_session cookie; hydrate authoritative identity from /_nexus/auth/me
      const identity = await authScope.refresh();
      const ok = Boolean(identity?.authenticated);
      if (!ok) {
        authScope.error = 'Session could not be verified after sign-in';
        return false;
      }
      dispatchAuthChanged(true, authScope.actor);
      return true;
    } catch (err) {
      authScope.error = err instanceof Error ? err.message : 'Network error during sign-in';
      return false;
    } finally {
      authScope.loading = false;
    }
  },

  signout: async (): Promise<void> => {
    if (typeof fetch === 'function') {
      try {
        await fetch(authScope.signoutEndpoint, {
          method: 'POST',
          credentials: 'same-origin'
        });
      } catch {
        // Proceed with local state cleanup even if offline
      }
    }
    authScope.user = null;
    authScope.actor = null;
    authScope.level = 'anonymous';
    authScope.isAuthenticated = false;
    authScope.roles = [];
    authScope.capabilities = [];
    authScope.token = null;
    authScope.error = null;
    dispatchAuthChanged(false, null);
  },

  // Backwards-compatible local helpers for offline labs/tests
  login: (userData: Record<string, unknown>) => {
    const roles = Array.isArray(userData?.roles) ? userData.roles.map(String) : [];
    const capabilities = Array.isArray(userData?.capabilities) ? userData.capabilities.map(String) : [];
    authScope.user = userData;
    authScope.actor = String(userData?.actor || userData?.name || userData?.email || 'user');
    authScope.isAuthenticated = true;
    authScope.roles = roles;
    authScope.capabilities = capabilities;
    authScope.hydrated = true;
  },
  logout: () => {
    void authScope.signout();
  }
});

export const scopeRule = (q: string, body: () => any) => {
  const query = String(q || '').trim();
  if (query === 'isAuthenticated' || query === 'authenticated') {
    return authScope.isAuthenticated ? body() : undefined;
  }
  if (query === 'anonymous' || query === '!isAuthenticated') {
    return !authScope.isAuthenticated ? body() : undefined;
  }
  if (authScope.hasRole(query) || authScope.can(query)) {
    return body();
  }
  return undefined;
};

let bootHydrationScheduled = false;

export const authScopeModule: ScopeModule = {
  name: 'auth',
  rule: 'auth',
  scopeRule,
  onRegister: () => {
    registerScopeProvider('$auth', () => authScope);
    if (!bootHydrationScheduled && typeof window !== 'undefined' && typeof fetch === 'function') {
      bootHydrationScheduled = true;
      void authScope.refresh();
    }
  }
};

export default authScopeModule;

