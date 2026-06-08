'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Prescription } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const patientId = user?.patient?.id;

  useEffect(() => {
    if (!patientId) return;
    api.get<Prescription[]>(`/prescriptions/patient/${patientId}`)
      .then((r) => setPrescriptions(r.data))
      .catch(() => toast.error('Error al cargar recetas'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="p-8 text-center">Cargando recetas...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis Recetas</h1>
        <p className="text-muted-foreground">Historial de prescripciones médicas</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tenés recetas emitidas todavía.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {new Date(rx.issuedAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{rx.digitalSignatureHash.slice(0, 8)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rx.medicationPayload.medications.map((med, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-semibold text-sm">{med.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {med.dose} — {med.frequency} — {med.duration}
                    </p>
                    {med.notes && <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>}
                  </div>
                ))}
                {rx.medicationPayload.instructions && (
                  <p className="text-sm text-muted-foreground italic">
                    {rx.medicationPayload.instructions}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Firma digital: {rx.digitalSignatureHash.slice(0, 32)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
