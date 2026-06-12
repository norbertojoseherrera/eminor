import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  Certificate,
  Doctor,
  Evolution,
  Patient,
  Prescription,
} from '@prisma/client';

type SoapData = {
  subjective?: string;
  objective?: string;
  assessment?: { text?: string; cie10Codes?: string[] };
  plan?: string;
  _signatureHash?: string;
};

type MedicationPayload = {
  medications?: {
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    notes?: string;
  }[];
  instructions?: string;
};

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  ATTENDANCE: 'Certificado de Asistencia',
  REST: 'Certificado de Reposo',
  FITNESS: 'Certificado de Aptitud Física',
  OTHER: 'Certificado Médico',
};

@Injectable()
export class PdfService {
  private render(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument, title: string) {
    doc
      .fontSize(18)
      .fillColor('#b45309')
      .text('EMINOR — Telemedicina', { align: 'left' })
      .moveDown(0.2)
      .fontSize(13)
      .fillColor('#000000')
      .text(title)
      .moveDown(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#e5e7eb')
      .stroke()
      .moveDown(1);
  }

  private patientDoctorBlock(
    doc: PDFKit.PDFDocument,
    patient: Patient,
    doctor: Doctor,
  ) {
    doc
      .fontSize(10)
      .fillColor('#374151')
      .text(
        `Paciente: ${patient.firstName} ${patient.lastName} — DNI ${patient.dni}`,
      )
      .text(
        `Médico: ${doctor.firstName} ${doctor.lastName} — Mat. ${doctor.licenseNumber} (${doctor.specialty})`,
      )
      .moveDown(1);
  }

  private signatureFooter(
    doc: PDFKit.PDFDocument,
    hash: string,
    issuedAt: Date,
  ) {
    doc
      .moveDown(1.5)
      .fontSize(8)
      .fillColor('#6b7280')
      .text(`Emitido el ${issuedAt.toLocaleString('es-AR')}`)
      .text(`Firma digital (hash): ${hash}`)
      .text(
        'Documento generado electrónicamente por EMINOR. Validez conforme Ley 27.553.',
      );
  }

  async generateEvolutionPdf(
    evolution: Evolution,
    patient: Patient,
    doctor: Doctor,
  ): Promise<Buffer> {
    const soap = (evolution.soapData ?? {}) as SoapData;
    return this.render((doc) => {
      this.header(doc, 'Evolución Médica (HCE)');
      this.patientDoctorBlock(doc, patient, doctor);

      doc.fontSize(10).fillColor('#000000');

      doc.font('Helvetica-Bold').text('Subjetivo (S)');
      doc
        .font('Helvetica')
        .text(soap.subjective || '—')
        .moveDown(0.5);

      doc.font('Helvetica-Bold').text('Objetivo (O)');
      doc
        .font('Helvetica')
        .text(soap.objective || '—')
        .moveDown(0.5);

      doc.font('Helvetica-Bold').text('Diagnóstico (A)');
      doc.font('Helvetica').text(soap.assessment?.text || '—');
      if (soap.assessment?.cie10Codes?.length) {
        doc.text(`Códigos CIE-10: ${soap.assessment.cie10Codes.join(', ')}`);
      }
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Plan (P)');
      doc
        .font('Helvetica')
        .text(soap.plan || '—')
        .moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text(`Estado: ${evolution.isSigned ? 'Firmada' : 'Sin firmar'}`);

      this.signatureFooter(
        doc,
        soap._signatureHash || '—',
        evolution.signedAt ?? evolution.createdAt,
      );
    });
  }

  async generatePrescriptionPdf(
    prescription: Prescription,
    patient: Patient,
    doctor: Doctor,
  ): Promise<Buffer> {
    const payload = (prescription.medicationPayload ?? {}) as MedicationPayload;
    return this.render((doc) => {
      this.header(doc, 'Receta Médica');
      this.patientDoctorBlock(doc, patient, doctor);

      doc
        .fontSize(10)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Medicamentos')
        .moveDown(0.3);
      doc.font('Helvetica');
      for (const med of payload.medications ?? []) {
        doc.text(
          `• ${med.name} — ${med.dose} — ${med.frequency} — ${med.duration}`,
        );
        if (med.notes) doc.text(`   ${med.notes}`, { indent: 10 });
      }

      if (payload.instructions) {
        doc.moveDown(0.5).font('Helvetica-Bold').text('Indicaciones');
        doc.font('Helvetica').text(payload.instructions);
      }

      this.signatureFooter(
        doc,
        prescription.digitalSignatureHash,
        prescription.issuedAt,
      );
    });
  }

  async generateCertificatePdf(
    certificate: Certificate,
    patient: Patient,
    doctor: Doctor,
  ): Promise<Buffer> {
    return this.render((doc) => {
      this.header(
        doc,
        CERTIFICATE_TYPE_LABELS[certificate.type] ?? 'Certificado Médico',
      );
      this.patientDoctorBlock(doc, patient, doctor);

      doc
        .fontSize(10)
        .fillColor('#000000')
        .text(certificate.content)
        .moveDown(0.5);

      if (certificate.type === 'REST' && certificate.restDays) {
        doc
          .font('Helvetica-Bold')
          .text(`Reposo indicado: ${certificate.restDays} día(s)`);
      }

      this.signatureFooter(
        doc,
        certificate.digitalSignatureHash,
        certificate.issuedAt,
      );
    });
  }
}
