import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt } from './common.js';
import { user } from './user.js';

/**
 * `role` — platform RBAC roles (DB §4.3).
 *
 * The seeded set is defined in `packages/contracts/src/rbac/roles.ts` so the API
 * and the database agree on one list. `is_system` marks roles that cannot be
 * deleted (D-2).
 */
export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(true),
  },
  (table) => [uniqueIndex('role_code_uq').on(table.code)],
);

/**
 * `permission` — the string permission catalog (DB §4.4).
 *
 * `is_privileged` drives admin step-up (Arch §6.6): a route requiring a
 * privileged permission also demands a fresh TOTP verification.
 */
export const permission = pgTable(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    /** Owning module — mirrors the Arch §2.2 ownership map (BR-1). */
    module: text('module').notNull(),
    description: text('description'),
    isPrivileged: boolean('is_privileged').notNull().default(false),
  },
  (table) => [
    uniqueIndex('permission_code_uq').on(table.code),
    index('permission_module_idx').on(table.module),
  ],
);

/**
 * `user_role` — M:N user ↔ role (DB §4.5).
 *
 * `expires_at` supports temporary elevation; the resolver must treat an expired
 * grant as absent rather than as a permission.
 */
export const userRole = pgTable(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'restrict' }),
    /** Admin who granted it — accountability for privilege changes (AZ-05). */
    grantedBy: text('granted_by').references(() => user.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('user_role_user_role_uq').on(table.userId, table.roleId),
    index('user_role_user_idx').on(table.userId),
    index('user_role_role_idx').on(table.roleId),
  ],
);

/** `role_permission` — M:N role ↔ permission (DB §4.6). */
export const rolePermission = pgTable(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('role_permission_role_perm_uq').on(table.roleId, table.permissionId),
    index('role_permission_role_idx').on(table.roleId),
  ],
);

export type RoleRow = typeof role.$inferSelect;
export type PermissionRow = typeof permission.$inferSelect;
export type UserRoleRow = typeof userRole.$inferSelect;

/**
 * Effective roles + permissions for one user, resolved in a single query.
 *
 * Expired grants are excluded here rather than at the call site so no consumer can
 * accidentally honour a lapsed elevation. An unknown permission is never produced
 * by this query, which is what makes AZ-01 (unknown ⇒ deny) enforceable.
 */
export const ACTIVE_ROLE_JOIN = sql`${userRole.roleId} = ${role.id} and (${userRole.expiresAt} is null or ${userRole.expiresAt} > now())`;
