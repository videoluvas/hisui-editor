/*
  Warnings:

  - You are about to drop the column `timeline_json` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "timeline_json",
ADD COLUMN     "edit_json_key" TEXT;
