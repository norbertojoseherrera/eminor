'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Certificate } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TYPE_LABELS: Record<string, string> = {
  ATTENDANCE: 'Certificado de Asistencia',
  REST: 'Certificado de Reposo',
  FITNESS: 'Certificado de Aptitud Física',
  OTHER: 'Certificado Médico',
};

export default function PatientCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const patientId = user?.patient?.id;

  useEffect(() => {
    if (!patientId) return;
    api.get<Certificate[]>(`/certificates/patient/${patientId}`)
      .then((r) => setCertificates(r.data))
      .catch(() => toast.error('Error al cargar certificados'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="p-8 text-center">Cargando certificados...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis Certificados</h1>
        <p className="text-muted-foreground">Certificados médicos emitidos por tus profesionales</p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tenés certificados emitidos todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {TYPE_LABELS[cert.type] ?? cert.type} — {new Date(cert.issuedAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{cert.digitalSignatureHash.slice(0, 8)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {cert.appointment?.doctor && (
                  <p className="text-xs text-muted-foreground">
                    {cert.appointment.doctor.specialty} — Mat. {cert.appointment.doctor.licenseNumber}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{cert.content}</p>
                {cert.type === 'REST' && cert.restDays && (
                  <p className="text-sm font-semibold">Reposo indicado: {cert.restDays} día(s)</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Firma digital: {cert.digitalSignatureHash.slice(0, 32)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
