'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';

interface DoctorPatient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  medicalInsurance: string | null;
  lastAppointment: string;
  appointmentsCount: number;
}

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<DoctorPatient[]>('/appointments/doctor/patients')
      .then((r) => setPatients(r.data))
      .catch(() => toast.error('Error al cargar pacientes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${p.firstName} ${p.lastName} ${p.dni}`.toLowerCase().includes(term);
  });

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Mis Pacientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pacientes con turnos asignados a vos
        </p>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o DNI..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/40"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">
            {patients.length === 0 ? 'Todavía no tenés pacientes' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/doctor/patients/${p.id}`)}
              className="w-full text-left bg-card rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">DNI {p.dni}</p>
                  {p.phone && (
                    <p className="text-xs text-muted-foreground">📞 {p.phone}</p>
                  )}
                  {p.medicalInsurance && (
                    <p className="text-xs text-muted-foreground">{p.medicalInsurance}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Última consulta</p>
                  <p className="text-xs font-medium">
                    {new Date(p.lastAppointment).toLocaleDateString('es-AR')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.appointmentsCount} turno{p.appointmentsCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
