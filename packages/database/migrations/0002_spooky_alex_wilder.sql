CREATE TABLE "geo_country" (
	"id" text PRIMARY KEY NOT NULL,
	"iso2" varchar(2) NOT NULL,
	"iso3" varchar(3) NOT NULL,
	"name" text NOT NULL,
	"phone_code" varchar(8),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"phone" varchar(20),
	"country_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"password_hash" text,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"verification_level" text DEFAULT 'NONE' NOT NULL,
	"preferred_currency" char(3) DEFAULT 'NPR' NOT NULL,
	"preferred_locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" text,
	"last_login_at" timestamp with time zone,
	"banned_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_verification_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'PENDING' NOT NULL,
	"token_hash" text,
	"expires_at" timestamp with time zone,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	"is_privileged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"granted_by" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_idp_account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"family_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"device_fingerprint" text,
	"ip_hash" text,
	"user_agent" text,
	"mfa_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text
);
--> statement-breakpoint
CREATE TABLE "mfa_enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'TOTP' NOT NULL,
	"secret_enc" "bytea" NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "otp_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"identifier_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"role_code" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"before_hash" text,
	"after_hash" text,
	"meta" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_key" (
	"id" text PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"scope_user_id" text,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ven_capability" (
	"id" text PRIMARY KEY NOT NULL,
	"ven_org_id" text NOT NULL,
	"line" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expiry_date" date,
	"reminder_sent_t30" boolean DEFAULT false NOT NULL,
	"reminder_sent_t7" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"rejection_reason" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ven_document" (
	"id" text PRIMARY KEY NOT NULL,
	"ven_org_id" text NOT NULL,
	"line" text,
	"doc_type" text NOT NULL,
	"title" text NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text,
	"valid_from" date,
	"valid_to" date,
	"status" text DEFAULT 'UPLOADED' NOT NULL,
	"review_note" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ven_org" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" "citext" NOT NULL,
	"phone" varchar(20),
	"country_id" text,
	"state_id" text,
	"district_id" text,
	"address_text" text,
	"website" text,
	"tax_id_masked" varchar(40),
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"rejection_reason" text,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"profile_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ven_user" (
	"id" text PRIMARY KEY NOT NULL,
	"ven_org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"org_role" text DEFAULT 'OWNER' NOT NULL,
	"status" text DEFAULT 'INVITED' NOT NULL,
	"invited_by" text,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_country_id_geo_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."geo_country"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_verification_event" ADD CONSTRAINT "user_verification_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_idp_account" ADD CONSTRAINT "auth_idp_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_enrollment" ADD CONSTRAINT "mfa_enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_capability" ADD CONSTRAINT "ven_capability_ven_org_id_ven_org_id_fk" FOREIGN KEY ("ven_org_id") REFERENCES "public"."ven_org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_capability" ADD CONSTRAINT "ven_capability_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_document" ADD CONSTRAINT "ven_document_ven_org_id_ven_org_id_fk" FOREIGN KEY ("ven_org_id") REFERENCES "public"."ven_org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_document" ADD CONSTRAINT "ven_document_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_org" ADD CONSTRAINT "ven_org_country_id_geo_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."geo_country"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_org" ADD CONSTRAINT "ven_org_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_user" ADD CONSTRAINT "ven_user_ven_org_id_ven_org_id_fk" FOREIGN KEY ("ven_org_id") REFERENCES "public"."ven_org"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_user" ADD CONSTRAINT "ven_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ven_user" ADD CONSTRAINT "ven_user_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "geo_country_iso2_uq" ON "geo_country" USING btree ("iso2");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_country_iso3_uq" ON "geo_country" USING btree ("iso3");--> statement-breakpoint
CREATE INDEX "geo_country_name_idx" ON "geo_country" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_uq" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_phone_uq" ON "user" USING btree ("phone") WHERE "user"."phone" is not null;--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_verification_event_user_idx" ON "user_verification_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_code_uq" ON "permission" USING btree ("code");--> statement-breakpoint
CREATE INDEX "permission_module_idx" ON "permission" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX "role_code_uq" ON "role" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_role_perm_uq" ON "role_permission" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "role_permission_role_idx" ON "role_permission" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_user_role_uq" ON "user_role" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_role" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_role_idx" ON "user_role" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_idp_provider_subject_uq" ON "auth_idp_account" USING btree ("provider","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_idp_user_provider_uq" ON "auth_idp_account" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_token_hash_uq" ON "auth_session" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_family_active_uq" ON "auth_session" USING btree ("family_id") WHERE "auth_session"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "auth_session_user_created_idx" ON "auth_session" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_session_family_idx" ON "auth_session" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "auth_session_expires_idx" ON "auth_session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mfa_enrollment_user_active_uq" ON "mfa_enrollment" USING btree ("user_id") WHERE "mfa_enrollment"."disabled_at" is null;--> statement-breakpoint
CREATE INDEX "otp_issue_identifier_created_idx" ON "otp_issue" USING btree ("identifier_hash","created_at");--> statement-breakpoint
CREATE INDEX "otp_issue_purpose_idx" ON "otp_issue" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "audit_log_actor_created_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_actor_type_idx" ON "audit_log" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "idempotency_key_hash_uq" ON "idempotency_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idempotency_key_expires_idx" ON "idempotency_key" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idempotency_key_scope_idx" ON "idempotency_key" USING btree ("scope_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ven_capability_org_line_uq" ON "ven_capability" USING btree ("ven_org_id","line");--> statement-breakpoint
CREATE INDEX "ven_capability_status_expiry_idx" ON "ven_capability" USING btree ("status","expiry_date");--> statement-breakpoint
CREATE INDEX "ven_document_org_type_status_idx" ON "ven_document" USING btree ("ven_org_id","doc_type","status");--> statement-breakpoint
CREATE INDEX "ven_document_status_valid_to_idx" ON "ven_document" USING btree ("status","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX "ven_org_slug_uq" ON "ven_org" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ven_org_status_idx" ON "ven_org" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ven_org_country_idx" ON "ven_org" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "ven_org_name_idx" ON "ven_org" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "ven_user_org_user_active_uq" ON "ven_user" USING btree ("ven_org_id","user_id") WHERE "ven_user"."status" <> 'REMOVED';--> statement-breakpoint
CREATE INDEX "ven_user_org_idx" ON "ven_user" USING btree ("ven_org_id");--> statement-breakpoint
CREATE INDEX "ven_user_user_idx" ON "ven_user" USING btree ("user_id");