'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Evolution, Study } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface MedicalRecord {
  firstName: string;
  lastName: string;
  evolutions: Evolution[];
  studies: Study[];
}

export default function PatientMedicalRecordPage() {
  const { user } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const patientId = user?.patient?.id;

  useEffect(() => {
    if (!patientId) return;
    api.get<MedicalRecord>(`/patients/${patientId}/medical-record`)
      .then((r) => setRecord(r.data))
      .catch(() => toast.error('Error al cargar historia clínica'))
      .finally(() => setLoading(false));
  }, [patientId]);

  const downloadStudy = async (studyId: string) => {
    const { data } = await api.get<{ url: string }>(`/studies/${studyId}/download-url`);
    window.open(data.url, '_blank');
  };

  if (loading) return <div className="p-8 text-center">Cargando historia clínica...</div>;
  if (!record) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi Historia Clínica</h1>
        <p className="text-muted-foreground">{record.firstName} {record.lastName}</p>
      </div>

      <Tabs defaultValue="evolutions">
        <TabsList>
          <TabsTrigger value="evolutions">Evoluciones ({record.evolutions.length})</TabsTrigger>
          <TabsTrigger value="studies">Estudios ({record.studies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="evolutions" className="space-y-4 mt-4">
          {record.evolutions.length === 0 ? (
            <p className="text-muted-foreground">Sin evoluciones registradas.</p>
          ) : (
            record.evolutions.map((evo) => (
              <Card key={evo.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {new Date(evo.createdAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                    </CardTitle>
                    {evo.isSigned && <Badge variant="outline" className="text-green-600">Firmado</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div><span className="font-semibold text-blue-600">S:</span> {evo.soapData.subjective}</div>
                  <div><span className="font-semibold text-blue-600">O:</span> {evo.soapData.objective}</div>
                  <div>
                    <span className="font-semibold text-blue-600">A:</span> {evo.soapData.assessment.text}
                    <div className="flex gap-1 mt-1">
                      {evo.soapData.assessment.cie10Codes.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div><span className="font-semibold text-blue-600">P:</span> {evo.soapData.plan}</div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="studies" className="space-y-3 mt-4">
          {record.studies.map((study) => (
            <Card key={study.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{study.title}</p>
                  <p className="text-sm text-muted-foreground">{new Date(study.uploadedAt).toLocaleDateString('es-AR')}</p>
                </div>
                <button onClick={() => downloadStudy(study.id)} className="text-sm text-blue-600 hover:underline">
                  Descargar
                </button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
