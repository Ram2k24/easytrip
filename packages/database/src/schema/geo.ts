import { boolean, index, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common.js';

/**
 * `geo_country` — the smallest slice of the geography module (DB §7.1).
 *
 * Phase 06 needs it only because `user.country_id` and `ven_org.country_id` are
 * foreign keys. The rest of §7 (states, districts, cities, aliases, airports,
 * destinations) ships with the destinations module; this table is additive-only
 * so that work will not have to migrate it.
 */
export const geoCountry = pgTable(
  'geo_country',
  {
    /** ULID (C-1). */
    id: text('id').primaryKey(),
    /** ISO 3166-1 alpha-2 — the stable business key (GC-1). */
    iso2: char2('iso2').notNull(),
    /** ISO 3166-1 alpha-3. */
    iso3: varchar('iso3', { length: 3 }).notNull(),
    name: text('name').notNull(),
    /** E.164 calling code without the `+` (GC-1 international formats). */
    phoneCode: varchar('phone_code', { length: 8 }),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('geo_country_iso2_uq').on(table.iso2),
    uniqueIndex('geo_country_iso3_uq').on(table.iso3),
    index('geo_country_name_idx').on(table.name),
  ],
);

/** Fixed-width CHAR(2) helper — keeps ISO codes exactly two bytes wide. */
function char2(name: string) {
  return varchar(name, { length: 2 });
}

export type GeoCountryRow = typeof geoCountry.$inferSelect;
export type NewGeoCountryRow = typeof geoCountry.$inferInsert;
