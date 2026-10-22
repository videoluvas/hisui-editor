-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "message" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "input_prefix" TEXT,
    "out_prefix" TEXT NOT NULL,
    "manifest_key" TEXT,
    "project_id" TEXT,
    "warnings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs"("user_id");

-- CreateIndex
CREATE INDEX "import_jobs_project_id_idx" ON "import_jobs"("project_id");
