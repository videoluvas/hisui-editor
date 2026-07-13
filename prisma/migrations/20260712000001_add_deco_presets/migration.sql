-- CreateTable
CREATE TABLE "deco_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deco_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deco_presets_user_id_idx" ON "deco_presets"("user_id");

-- AddForeignKey
ALTER TABLE "deco_presets" ADD CONSTRAINT "deco_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
