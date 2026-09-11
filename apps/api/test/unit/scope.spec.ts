import { allScope, assertScopeIsUsable, orgScope, selfScope } from '../../src/common/scope/scope';

describe('Scope contract (Arch §6.2, deny-by-default)', () => {
  it('accepts well-formed scopes', () => {
    expect(() => assertScopeIsUsable(selfScope('user_1'))).not.toThrow();
    expect(() => assertScopeIsUsable(orgScope('org_1'))).not.toThrow();
    expect(() => assertScopeIsUsable(allScope())).not.toThrow();
  });

  it('fails closed when an identifier is missing', () => {
    expect(() => assertScopeIsUsable({ level: 'self' })).toThrow(/requires userId/);
    expect(() => assertScopeIsUsable({ level: 'org' })).toThrow(/requires orgId/);
  });
});
