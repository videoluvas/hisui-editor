-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "background_color" TEXT DEFAULT '#000000',
ADD COLUMN     "fps" INTEGER DEFAULT 30,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;
