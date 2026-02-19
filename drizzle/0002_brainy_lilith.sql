ALTER TABLE "family_links" ADD COLUMN "token_hmac" text;--> statement-breakpoint
CREATE UNIQUE INDEX "family_links_token_hmac_idx" ON "family_links" USING btree ("token_hmac");