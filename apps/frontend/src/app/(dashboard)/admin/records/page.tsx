'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPatientSummary, AdminPatientRecords } from '@/types';

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  ATTENDANCE: 'Certificado de Asistencia',
  REST: 'Certificado de Reposo',
  FITNESS: 'Certificado de Aptitud Física',
  OTHER: 'Certificado Médico',
};

async function downloadPdf(path: string, filename: string) {
  try {
    const res = await api.get(path, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Error al generar el PDF');
  }
}

export default function AdminRecordsPage() {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<AdminPatientSummary[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selected, setSelected] = useState<AdminPatientSummary | null>(null);
  const [records, setRecords] = useState<AdminPatientRecords | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const fetchPatients = (q?: string) => {
    setLoadingPatients(true);
    api.get<AdminPatientSummary[]>('/admin/patients', { params: q ? { search: q } : {} })
      .then((r) => setPatients(r.data))
      .catch(() => toast.error('Error al cargar pacientes'))
      .finally(() => setLoadingPatients(false));
  };

  useEffect(() => { fetchPatients(); }, []);

  const selectPatient = (patient: AdminPatientSummary) => {
    setSelected(patient);
    setLoadingRecords(true);
    api.get<AdminPatientRecords>(`/admin/patients/${patient.id}/records`)
      .then((r) => setRecords(r.data))
      .catch(() => toast.error('Error al cargar registros del paciente'))
      .finally(() => setLoadingRecords(false));
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Registros Médicos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualizá y descargá en PDF evoluciones, recetas y certificados de cualquier paciente
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Buscar por nombre, apellido o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchPatients(search); }}
          className="rounded-xl"
        />
        <Button onClick={() => fetchPatients(search)} className="rounded-xl">Buscar</Button>
      </div>

      {!selected ? (
        loadingPatients ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : patients.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No se encontraron pacientes.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full text-left bg-card rounded-2xl border border-border/60 p-4 flex items-center justify-between shadow-sm hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-foreground">{p.firstName} {p.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">DNI {p.dni} — {p.user.email}</p>
                </div>
                <span className="text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selected.firstName} {selected.lastName}</h2>
              <p className="text-sm text-muted-foreground">DNI {selected.dni} — {selected.user.email}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-9"
              onClick={() => { setSelected(null); setRecords(null); }}>
              Volver
            </Button>
          </div>

          {loadingRecords || !records ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}</div>
          ) : (
            <Tabs defaultValue="evolutions">
              <TabsList className="w-full">
                <TabsTrigger value="evolutions" className="flex-1">Evoluciones</TabsTrigger>
                <TabsTrigger value="prescriptions" className="flex-1">Recetas</TabsTrigger>
                <TabsTrigger value="certificates" className="flex-1">Certificados</TabsTrigger>
              </TabsList>

              <TabsContent value="evolutions" className="space-y-3 pt-3">
                {records.evolutions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin evoluciones registradas.</p>
                ) : (
                  records.evolutions.map((evo) => (
                    <Card key={evo.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {new Date(evo.createdAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                            {evo.isSigned && <Badge variant="outline" className="ml-2 text-xs">Firmada</Badge>}
                          </CardTitle>
                          <Button size="sm" variant="ghost" className="text-xs h-8 rounded-xl"
                            onClick={() => downloadPdf(`/admin/evolutions/${evo.id}/pdf`, `evolucion-${evo.id}.pdf`)}>
                            Descargar PDF
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 text-muted-foreground">
                        {evo.appointment?.doctor && (
                          <p>{evo.appointment.doctor.firstName} {evo.appointment.doctor.lastName} — {evo.appointment.doctor.specialty} (Mat. {evo.appointment.doctor.licenseNumber})</p>
                        )}
                        <p><strong>A:</strong> {evo.soapData.assessment?.text}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="prescriptions" className="space-y-3 pt-3">
                {records.prescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin recetas emitidas.</p>
                ) : (
                  records.prescriptions.map((rx) => (
                    <Card key={rx.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {new Date(rx.issuedAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                          </CardTitle>
                          <Button size="sm" variant="ghost" className="text-xs h-8 rounded-xl"
                            onClick={() => downloadPdf(`/admin/prescriptions/${rx.id}/pdf`, `receta-${rx.id}.pdf`)}>
                            Descargar PDF
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 text-muted-foreground">
                        {rx.appointment?.doctor && (
                          <p>{rx.appointment.doctor.firstName} {rx.appointment.doctor.lastName} — {rx.appointment.doctor.specialty} (Mat. {rx.appointment.doctor.licenseNumber})</p>
                        )}
                        <p>{rx.medicationPayload.medications.map((m) => m.name).join(', ')}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="certificates" className="space-y-3 pt-3">
                {records.certificates.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Sin certificados emitidos.</p>
                ) : (
                  records.certificates.map((cert) => (
                    <Card key={cert.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {CERTIFICATE_TYPE_LABELS[cert.type] ?? cert.type} — {new Date(cert.issuedAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
                          </CardTitle>
                          <Button size="sm" variant="ghost" className="text-xs h-8 rounded-xl"
                            onClick={() => downloadPdf(`/admin/certificates/${cert.id}/pdf`, `certificado-${cert.id}.pdf`)}>
                            Descargar PDF
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1 text-muted-foreground">
                        {cert.appointment?.doctor && (
                          <p>{cert.appointment.doctor.firstName} {cert.appointment.doctor.lastName} — {cert.appointment.doctor.specialty} (Mat. {cert.appointment.doctor.licenseNumber})</p>
                        )}
                        <p className="whitespace-pre-wrap">{cert.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}
