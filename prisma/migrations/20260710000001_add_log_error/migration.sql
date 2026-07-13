CREATE TABLE "logs_error" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'error',
    "source" TEXT NOT NULL,
    "user_id" TEXT,
    "message" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_error_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "logs_error_created_at_idx" ON "logs_error"("created_at");
CREATE INDEX "logs_error_level_created_at_idx" ON "logs_error"("level", "created_at");
CREATE INDEX "logs_error_source_created_at_idx" ON "logs_error"("source", "created_at");
