-- AlterTable: remove test/debug columns from storyboard_main
ALTER TABLE "storyboard_main" DROP COLUMN IF EXISTS "log";
ALTER TABLE "storyboard_main" DROP COLUMN IF EXISTS "test_json";
ALTER TABLE "storyboard_main" DROP COLUMN IF EXISTS "test_list";
ALTER TABLE "storyboard_main" DROP COLUMN IF EXISTS "test_no";
