import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { citext, createdAt, updatedAt } from './common.js';
import { geoCountry } from './geo.js';
import { user } from './user.js';

/** `ven_org.status` (DB §3). The approval workflow moves through these. */
export const VEN_ORG_STATUS = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'CLOSED',
] as const;
export type VenOrgStatus = (typeof VEN_ORG_STATUS)[number];

/** `ven_user.org_role` (DB §6.2, D-2). Distinct from platform RBAC on purpose. */
export const VEN_ORG_ROLES = ['OWNER', 'MANAGER', 'STAFF'] as const;
export type VenOrgRole = (typeof VEN_ORG_ROLES)[number];

/** `ven_user.status` (DB §6.2). */
export const VEN_USER_STATUS = ['ACTIVE', 'INVITED', 'REMOVED'] as const;
export type VenUserStatus = (typeof VEN_USER_STATUS)[number];

/** `svc_line` (DB §3) — the service lines a vendor may be approved for. */
export const SERVICE_LINES = [
  'TOUR',
  'TREK',
  'HOTEL',
  'VEHICLE',
  'TRANSFER',
  'TRANSPORTATION',
  'PACKAGE',
  'FLIGHT',
  'EXPERIENCE',
] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];

/** `ven_capability.status` (DB §3, PRD VA-05/06). */
export const VEN_CAPABILITY_STATUS = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
  'EXPIRED',
] as const;
export type VenCapabilityStatus = (typeof VEN_CAPABILITY_STATUS)[number];

/** `ven_document.status` (DB §3). */
export const VEN_DOCUMENT_STATUS = [
  'UPLOADED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;
export type VenDocumentStatus = (typeof VEN_DOCUMENT_STATUS)[number];

/** `ven_document.doc_type` (DB §6.4). */
export const VEN_DOCUMENT_TYPES = [
  'REGISTRATION',
  'LICENSE',
  'INSURANCE',
  'TAX',
  'IATA_ACCREDITATION',
  'PARTNERSHIP',
  'OTHER',
] as const;
export type VenDocumentType = (typeof VEN_DOCUMENT_TYPES)[number];

/**
 * `ven_org` — a vendor business (DB §6.1).
 *
 * This is the unit of vendor isolation (AZ-02): everything a vendor owns is scoped
 * through `ven_user` membership of this row, never through the vendor's platform
 * role alone.
 */
export const venOrg = pgTable(
  'ven_org',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    email: citext('email').notNull(),
    phone: varchar('phone', { length: 20 }),
    countryId: text('country_id').references(() => geoCountry.id, { onDelete: 'restrict' }),
    /**
     * Plain nullable text for now. DB §6.1 specifies FKs to `geo_state` /
     * `geo_district`; those tables ship with the destinations module and the
     * constraints are added then, so this stays additive-only.
     */
    stateId: text('state_id'),
    districtId: text('district_id'),
    addressText: text('address_text'),
    website: text('website'),
    /** Masked tax id — finance-scoped (BR-6); the full value is never stored here. */
    taxIdMasked: varchar('tax_id_masked', { length: 40 }),
    status: text('status').notNull().default('DRAFT'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    /** Admin who approved — accountability (AZ-05). */
    approvedBy: text('approved_by').references(() => user.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    /** Display-only content (about, highlights). No pricing lives here. */
    profileMeta: jsonb('profile_meta'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('ven_org_slug_uq').on(table.slug),
    index('ven_org_status_idx').on(table.status),
    index('ven_org_country_idx').on(table.countryId),
    index('ven_org_name_idx').on(table.name),
  ],
);

/**
 * `ven_user` — vendor team membership + org role (DB §6.2).
 *
 * The partial unique index allows a removed member to be re-invited without
 * colliding with the historical row.
 */
export const venUser = pgTable(
  'ven_user',
  {
    id: text('id').primaryKey(),
    venOrgId: text('ven_org_id')
      .notNull()
      .references(() => venOrg.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgRole: text('org_role').notNull().default('OWNER'),
    status: text('status').notNull().default('INVITED'),
    invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('ven_user_org_user_active_uq')
      .on(table.venOrgId, table.userId)
      .where(sql`${table.status} <> 'REMOVED'`),
    index('ven_user_org_idx').on(table.venOrgId),
    index('ven_user_user_idx').on(table.userId),
  ],
);

/**
 * `ven_capability` — per-line approval + expiry (DB §6.3, PRD VA-05/06).
 *
 * Gates publishing in a service line (Arch BR-4). Unique per org+line so approval
 * is a state transition on one row rather than an accumulating history.
 */
export const venCapability = pgTable(
  'ven_capability',
  {
    id: text('id').primaryKey(),
    venOrgId: text('ven_org_id')
      .notNull()
      .references(() => venOrg.id, { onDelete: 'cascade' }),
    line: text('line').notNull(),
    status: text('status').notNull().default('PENDING'),
    expiryDate: date('expiry_date'),
    reminderSentT30: boolean('reminder_sent_t30').notNull().default(false),
    reminderSentT7: boolean('reminder_sent_t7').notNull().default(false),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: text('approved_by').references(() => user.id, { onDelete: 'set null' }),
    rejectionReason: text('rejection_reason'),
    meta: jsonb('meta'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('ven_capability_org_line_uq').on(table.venOrgId, table.line),
    index('ven_capability_status_expiry_idx').on(table.status, table.expiryDate),
  ],
);

/**
 * `ven_document` — uploaded verification documents (DB §6.4).
 *
 * Only the S3 object key is stored (BR-6): the file itself lives in the private
 * bucket and is never served directly. `version` keeps re-upload history.
 */
export const venDocument = pgTable(
  'ven_document',
  {
    id: text('id').primaryKey(),
    venOrgId: text('ven_org_id')
      .notNull()
      .references(() => venOrg.id, { onDelete: 'cascade' }),
    /** NULL means an org-level registration document; otherwise line-specific. */
    line: text('line'),
    docType: text('doc_type').notNull(),
    title: text('title').notNull(),
    fileKey: text('file_key').notNull(),
    fileName: text('file_name'),
    validFrom: date('valid_from'),
    validTo: date('valid_to'),
    status: text('status').notNull().default('UPLOADED'),
    reviewNote: text('review_note'),
    reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('ven_document_org_type_status_idx').on(table.venOrgId, table.docType, table.status),
    index('ven_document_status_valid_to_idx').on(table.status, table.validTo),
  ],
);

export type VenOrgRow = typeof venOrg.$inferSelect;
export type NewVenOrgRow = typeof venOrg.$inferInsert;
export type VenUserRow = typeof venUser.$inferSelect;
export type VenCapabilityRow = typeof venCapability.$inferSelect;
export type VenDocumentRow = typeof venDocument.$inferSelect;
