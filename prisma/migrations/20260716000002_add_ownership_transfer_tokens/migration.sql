-- CreateTable: ownership_transfer_tokens
CREATE TABLE "ownership_transfer_tokens" (
  "id"            TEXT        NOT NULL,
  "resource_type" TEXT        NOT NULL,
  "resource_id"   TEXT        NOT NULL,
  "resource_name" TEXT        NOT NULL,
  "from_user_id"  TEXT        NOT NULL,
  "from_user_name" TEXT,
  "to_email"      TEXT        NOT NULL,
  "token_hash"    TEXT        NOT NULL,
  "expires_at"    TIMESTAMP(3) NOT NULL,
  "accepted_at"   TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ownership_transfer_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ownership_transfer_tokens_token_hash_key"  ON "ownership_transfer_tokens"("token_hash");
CREATE        INDEX "ownership_transfer_tokens_resource_id_idx" ON "ownership_transfer_tokens"("resource_id");
