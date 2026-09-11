/**
 * Object-scope model (Arch §6.2 layer 2/3, PRD AR-2).
 *
 * Every query in a scoped module must carry a `Scope`; cross-scope reads return
 * 404 rather than 403 so existence is never leaked (AZ rules). Phase 05 defines
 * the contract; domain repositories enforce it from Phase 06.
 */
export type ScopeLevel = 'self' | 'org' | 'all';

export interface Scope {
  level: ScopeLevel;
  /** Present for `self` (customer) scopes. */
  userId?: string;
  /** Present for `org` (vendor / corporate) scopes. */
  orgId?: string;
}

export const selfScope = (userId: string): Scope => ({ level: 'self', userId });
export const orgScope = (orgId: string): Scope => ({ level: 'org', orgId });
export const allScope = (): Scope => ({ level: 'all' });

/**
 * Fail-closed guard for repository authors: a scope that declares a level but is
 * missing its identifier is a programming error, not an empty result set.
 */
export function assertScopeIsUsable(scope: Scope): void {
  if (scope.level === 'self' && !scope.userId) {
    throw new Error('Scope level "self" requires userId (deny-by-default, Arch §6.2)');
  }
  if (scope.level === 'org' && !scope.orgId) {
    throw new Error('Scope level "org" requires orgId (deny-by-default, Arch §6.2)');
  }
}
