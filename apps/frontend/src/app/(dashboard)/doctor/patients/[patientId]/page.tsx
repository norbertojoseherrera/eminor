'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Evolution, Study } from '@/types';

interface MedicalRecord {
  firstName: string;
  lastName: string;
  documentType: 'DNI' | 'PASAPORTE';
  dni: string;
  phone: string;
  evolutions: Evolution[];
  studies: Study[];
}

export default function DoctorPatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const router = useRouter();
  const [record, setRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    api.get<MedicalRecord>(`/patients/${patientId}/medical-record`)
      .then((r) => setRecord(r.data))
      .catch(() => {
        toast.error('Error al cargar la historia clínica');
        router.push('/doctor/patients');
      });
  }, [patientId, router]);

  if (!record) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-3 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-9 w-full bg-muted rounded" />
        <div className="h-24 w-full bg-muted rounded" />
        <div className="h-24 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {record.firstName} {record.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{record.documentType} {record.dni}</p>
          {record.phone && (
            <p className="text-sm text-muted-foreground mt-0.5">📞 {record.phone}</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-xs h-9" onClick={() => router.push('/doctor/patients')}>
          Volver
        </Button>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="flex-1">Historial HCE</TabsTrigger>
          <TabsTrigger value="studies" className="flex-1">Estudios</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3 pt-3">
          {record.evolutions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin evoluciones previas.</p>
          ) : (
            record.evolutions.map((evo) => (
              <Card key={evo.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {new Date(evo.createdAt).toLocaleDateString('es-AR')}
                    {evo.isSigned && <span className="ml-2 text-xs text-green-600">✓ Firmado</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p><strong>S:</strong> {evo.soapData.subjective}</p>
                  <p><strong>O:</strong> {evo.soapData.objective}</p>
                  <p><strong>A:</strong> {evo.soapData.assessment.text}{evo.soapData.assessment.cie10Codes.length > 0 ? ` [${evo.soapData.assessment.cie10Codes.join(', ')}]` : ''}</p>
                  <p><strong>P:</strong> {evo.soapData.plan}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="studies" className="space-y-3 pt-3">
          {record.studies.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin estudios cargados.</p>
          ) : (
            record.studies.map((study) => (
              <Card key={study.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{study.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(study.uploadedAt).toLocaleDateString('es-AR')}</p>
                  </div>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={async () => {
                      const { data } = await api.get<{ url: string }>(`/studies/${study.id}/download-url`);
                      window.open(data.url, '_blank');
                    }}
                  >
                    Ver
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
