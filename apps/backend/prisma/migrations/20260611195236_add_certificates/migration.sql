-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ATTENDANCE', 'REST', 'FITNESS', 'OTHER');

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "content" TEXT NOT NULL,
    "rest_days" INTEGER,
    "digital_signature_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_appointment_id_key" ON "certificates"("appointment_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
