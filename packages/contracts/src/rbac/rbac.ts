/**
 * RBAC catalog — the single source of truth for roles and permissions.
 *
 * Seeded into `role` / `permission` / `role_permission` (DB §4.3–4.6) and enforced
 * at runtime by the API guard. Deny-by-default: a permission absent from a role's
 * list is refused, and an *unknown* permission is refused too (AZ-01).
 *
 * ## Notation
 * DB §4.4 specifies dot-notation codes (`vendor.approve`, `settings.write`);
 * Arch §6.1 writes the same permissions with colons (`vendors:approve`). The
 * database document is the schema authority, so dot notation wins here and §6.1's
 * names map 1:1 onto it.
 *
 * ## Role set
 * The nine roles below are the ones specified for Phase 06. This differs from
 * Arch §6.1 / DB §4.3, which seed `SUPER_ADMIN, OPS, FINANCE, SUPPORT, TRIP_DESK,
 * CUST, VENDOR`:
 *   - `OPS` → `OPERATIONS`, `CUST` → `CUSTOMER` (renamed)
 *   - `ADMIN` added as a broad-but-not-supreme administrator
 *   - `CORPORATE_ADMIN` / `CORPORATE_USER` added (Arch §6.4 keeps corporate roles
 *     in a separate `corp_org` system; they are represented as platform roles here
 *     so one guard covers every route, and the finer OWNER/APPROVER/BOOKER/VIEWER
 *     matrix layers on inside the corporate module)
 *   - `TRIP_DESK` is **not** in the Phase 06 list. Its `tripsdesk.work` permission
 *     remains in the catalog with no role mapped, so it resolves to deny for
 *     everyone — fail-closed rather than silently granted.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'OPERATIONS',
  'FINANCE',
  'SUPPORT',
  'VENDOR',
  'CUSTOMER',
  'CORPORATE_ADMIN',
  'CORPORATE_USER',
] as const;

export type RoleCode = (typeof ROLES)[number];

const ROLE_SET: ReadonlySet<string> = new Set(ROLES);

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === 'string' && ROLE_SET.has(value);
}

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  /**
   * Admin-class roles must complete TOTP MFA to sign in at all (Arch §5.1:
   * "TOTP MFA — MVP, admin required").
   */
  requiresMfa: boolean;
  /**
   * Roles that see data beyond their own account/org. Used by the object-scope
   * policy layer (Arch §6.2 layer 2) to decide `own` / `org` / `all`.
   */
  scope: 'all' | 'org' | 'own';
}

export const ROLE_DEFINITIONS: Readonly<Record<RoleCode, RoleDefinition>> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Unrestricted platform access, including settings that no other role can write.',
    requiresMfa: true,
    scope: 'all',
  },
  ADMIN: {
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Broad administrative access across operations, support and finance reads.',
    requiresMfa: true,
    scope: 'all',
  },
  OPERATIONS: {
    code: 'OPERATIONS',
    name: 'Operations',
    description: 'Vendor onboarding and approval, content and geography, operational reporting.',
    requiresMfa: true,
    scope: 'all',
  },
  FINANCE: {
    code: 'FINANCE',
    name: 'Finance',
    description: 'Payments, refunds, settlements and financial reporting.',
    requiresMfa: true,
    scope: 'all',
  },
  SUPPORT: {
    code: 'SUPPORT',
    name: 'Support',
    description: 'Customer assistance, dispute case work and read access to bookings.',
    requiresMfa: true,
    scope: 'all',
  },
  VENDOR: {
    code: 'VENDOR',
    name: 'Vendor',
    description: 'A vendor team member; access is limited to their own vendor organisation.',
    requiresMfa: false,
    scope: 'org',
  },
  CUSTOMER: {
    code: 'CUSTOMER',
    name: 'Customer',
    description: 'An end customer; access is limited to their own account and bookings.',
    requiresMfa: false,
    scope: 'own',
  },
  CORPORATE_ADMIN: {
    code: 'CORPORATE_ADMIN',
    name: 'Corporate Administrator',
    description: 'Manages a corporate organisation: members, policy and approvals.',
    requiresMfa: true,
    scope: 'org',
  },
  CORPORATE_USER: {
    code: 'CORPORATE_USER',
    name: 'Corporate User',
    description: 'A member of a corporate organisation; sees own and org-shared bookings.',
    requiresMfa: false,
    scope: 'org',
  },
};

/** Roles that must pass TOTP at login (Arch §5.1, §6.6). */
export const MFA_REQUIRED_ROLES: readonly RoleCode[] = ROLES.filter(
  (code) => ROLE_DEFINITIONS[code].requiresMfa,
);

export function roleRequiresMfa(role: RoleCode): boolean {
  return ROLE_DEFINITIONS[role].requiresMfa;
}

export function requiresMfa(roles: readonly RoleCode[]): boolean {
  return roles.some((role) => ROLE_DEFINITIONS[role]?.requiresMfa === true);
}

/**
 * The permission catalog (DB §4.4).
 *
 * `privileged` marks permissions that additionally require a fresh TOTP step-up
 * within `MFA_STEP_UP_WINDOW_S` (Arch §6.6) — approving a vendor, writing settings
 * or approving a refund must not be possible from a hijacked, idle session.
 */
export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
  privileged: boolean;
}

const p = (
  code: string,
  module: string,
  description: string,
  privileged = false,
): PermissionDefinition => ({ code, module, description, privileged });

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  // auth / identity
  p('auth.session.read', 'auth', 'List own active sessions and revoke them'),
  p('user.read.all', 'users', 'Read any user account'),
  p('user.manage', 'users', 'Create, edit and deactivate user accounts'),
  p('user.ban', 'users', 'Ban or unban a user account', true),
  p('user.impersonate', 'users', 'Impersonate another user for support', true),

  // customers
  p('customer.read.all', 'customers', 'Read any customer profile'),
  p('customer.manage', 'customers', 'Edit customer profiles and preferences'),

  // vendors
  p('vendor.read.own', 'vendors', 'Read the own vendor organisation'),
  p('vendor.write.own', 'vendors', 'Edit own vendor profile and business information'),
  p('vendor.document.upload.own', 'vendors', 'Upload documents for the own organisation'),
  p('vendor.read.all', 'vendors', 'Read any vendor organisation'),
  p('vendor.approve', 'vendors', 'Approve or reject a vendor organisation', true),
  p('vendor.suspend', 'vendors', 'Suspend or reinstate a vendor organisation', true),
  p('vendor.document.review', 'vendors', 'Review uploaded vendor documents'),
  p('vendor.capability.manage', 'vendors', 'Grant or revoke per-line capabilities'),

  // corporate
  p('corporate.read.own', 'corporate', 'Read own corporate organisation'),
  p('corporate.manage.own', 'corporate', 'Manage members and policy of own organisation'),
  p('corporate.kyc', 'corporate', 'Perform corporate KYC review', true),

  // finance
  p('payment.read.all', 'payments', 'Read any payment'),
  p('payment.verify_bank', 'payments', 'Verify a manual bank transfer', true),
  p('refund.read.all', 'refunds', 'Read any refund'),
  p('refund.approve', 'refunds', 'Approve or reject a refund', true),
  p('settlement.manage', 'payments', 'Manage vendor settlements and payouts', true),

  // bookings
  p('booking.read.all', 'bookings', 'Read any booking'),
  p('booking.intervene', 'bookings', 'Force-cancel or extend a booking', true),

  // content / geography
  p('content.manage', 'content', 'Create and publish CMS content'),
  p('geo.manage', 'destinations', 'Manage geography records'),
  p('destination.manage', 'destinations', 'Manage destinations'),

  // reports / audit / settings
  p('report.ops', 'reports', 'Operational reports'),
  p('report.finance', 'reports', 'Financial reports'),
  p('audit.read', 'auth', 'Read the audit log'),
  p('settings.read', 'admin', 'Read platform settings'),
  p('settings.write', 'admin', 'Write platform settings (commission, SLAs, flags, fx)', true),

  // dispute
  p('dispute.manage', 'disputes', 'Work and resolve disputes'),

  // Present in Arch §6.1 but mapped to no role in Phase 06 — see the role note above.
  p('tripsdesk.work', 'quotes', 'Quote routing, offer threads and custom-trip coordination'),
];

export type PermissionCode = (typeof PERMISSION_DEFINITIONS)[number]['code'];

const PERMISSION_BY_CODE = new Map(PERMISSION_DEFINITIONS.map((def) => [def.code, def]));

export function isPermissionCode(value: unknown): value is PermissionCode {
  return typeof value === 'string' && PERMISSION_BY_CODE.has(value);
}

export function permissionDefinition(code: string): PermissionDefinition | undefined {
  return PERMISSION_BY_CODE.get(code);
}

/**
 * Permissions that require step-up MFA (Arch §6.6). Derived, never hand-listed, so
 * adding `privileged: true` to a definition is enough to protect the route.
 */
export const PRIVILEGED_PERMISSIONS: ReadonlySet<string> = new Set(
  PERMISSION_DEFINITIONS.filter((def) => def.privileged).map((def) => def.code),
);

export function isPrivilegedPermission(code: string): boolean {
  return PRIVILEGED_PERMISSIONS.has(code);
}

/**
 * Role → permission map.
 *
 * Deny-by-default: anything not listed here is refused. `SUPER_ADMIN` is the only
 * role with the wildcard, and even it is expanded explicitly at resolve time so an
 * audit row always names a concrete permission.
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly string[]>> = {
  SUPER_ADMIN: ['*'],

  ADMIN: [
    'auth.session.read',
    'user.read.all',
    'user.manage',
    'user.ban',
    'customer.read.all',
    'customer.manage',
    'vendor.read.all',
    'vendor.approve',
    'vendor.suspend',
    'vendor.document.review',
    'vendor.capability.manage',
    'corporate.read.own',
    'corporate.kyc',
    'payment.read.all',
    'refund.read.all',
    'booking.read.all',
    'booking.intervene',
    'content.manage',
    'geo.manage',
    'destination.manage',
    'report.ops',
    'report.finance',
    'audit.read',
    'settings.read',
    'dispute.manage',
  ],

  OPERATIONS: [
    'auth.session.read',
    'user.read.all',
    'customer.read.all',
    'customer.manage',
    'vendor.read.all',
    'vendor.approve',
    'vendor.suspend',
    'vendor.document.review',
    'vendor.capability.manage',
    'booking.read.all',
    'booking.intervene',
    'content.manage',
    'geo.manage',
    'destination.manage',
    'report.ops',
    'audit.read',
    'settings.read',
    'dispute.manage',
  ],

  FINANCE: [
    'auth.session.read',
    'user.read.all',
    'vendor.read.all',
    'payment.read.all',
    'payment.verify_bank',
    'refund.read.all',
    'refund.approve',
    'settlement.manage',
    'booking.read.all',
    'report.finance',
    'audit.read',
    'settings.read',
    'dispute.manage',
  ],

  SUPPORT: [
    'auth.session.read',
    'user.read.all',
    'customer.read.all',
    'customer.manage',
    'vendor.read.all',
    'payment.read.all',
    'refund.read.all',
    'booking.read.all',
    'settings.read',
    'dispute.manage',
  ],

  VENDOR: [
    'auth.session.read',
    'vendor.read.own',
    'vendor.write.own',
    'vendor.document.upload.own',
  ],

  CUSTOMER: ['auth.session.read'],

  CORPORATE_ADMIN: ['auth.session.read', 'corporate.read.own', 'corporate.manage.own'],

  CORPORATE_USER: ['auth.session.read', 'corporate.read.own'],
};

/**
 * Expand a set of roles to its effective permissions.
 *
 * The `SUPER_ADMIN` wildcard is expanded to every concrete code rather than being
 * propagated as `*`, so downstream checks and audit entries always see a real
 * permission and can never match an unknown one (AZ-01).
 */
export function permissionsForRoles(roles: readonly RoleCode[]): ReadonlySet<string> {
  const granted = new Set<string>();
  for (const role of roles) {
    const list = ROLE_PERMISSIONS[role];
    if (list === undefined) continue; // unknown role ⇒ contributes nothing
    for (const code of list) {
      if (code === '*') {
        for (const def of PERMISSION_DEFINITIONS) granted.add(def.code);
      } else if (PERMISSION_BY_CODE.has(code)) {
        granted.add(code);
      }
      // A code that is not in the catalog is dropped, never granted (AZ-01).
    }
  }
  return granted;
}

export function hasPermission(roles: readonly RoleCode[], permission: string): boolean {
  // Unknown permission ⇒ deny (AZ-01), even for SUPER_ADMIN.
  if (!PERMISSION_BY_CODE.has(permission)) return false;
  return permissionsForRoles(roles).has(permission);
}

/**
 * Object-scope resolution (Arch §6.2 layer 2).
 *
 * The *narrowest* scope among a user's roles wins, then is widened only by an
 * explicit `all`-scoped role. Vendor and corporate users are `org`-scoped;
 * customers are `own`-scoped; platform staff are `all`.
 */
export type AccessScope = 'all' | 'org' | 'own';

export function scopeForRoles(roles: readonly RoleCode[]): AccessScope {
  if (roles.length === 0) return 'own';
  if (roles.some((role) => ROLE_DEFINITIONS[role]?.scope === 'all')) return 'all';
  if (roles.some((role) => ROLE_DEFINITIONS[role]?.scope === 'org')) return 'org';
  return 'own';
}
