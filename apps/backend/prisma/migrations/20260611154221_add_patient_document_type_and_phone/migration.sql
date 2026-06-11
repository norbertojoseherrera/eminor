-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'PASAPORTE');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "document_type" "DocumentType" NOT NULL DEFAULT 'DNI',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';
