CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempt" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "outbox_aggregate_created_idx" ON "outbox" USING btree ("aggregate_type","aggregate_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_event_type_idx" ON "outbox" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "outbox_unpublished_idx" ON "outbox" USING btree ("created_at") WHERE "outbox"."published_at" is null;