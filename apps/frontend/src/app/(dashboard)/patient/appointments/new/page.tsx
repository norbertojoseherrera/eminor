'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function NewAppointmentPage() {
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Doctor[]>('/doctors')
      .then((r) => setDoctors(r.data))
      .catch(() => toast.error('Error al cargar médicos'))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const specialties = useMemo(
    () => Array.from(new Set(doctors.map((d) => d.specialty))).sort(),
    [doctors],
  );

  const filteredDoctors = useMemo(
    () => (specialty ? doctors.filter((d) => d.specialty === specialty) : doctors),
    [doctors, specialty],
  );

  useEffect(() => {
    setSelectedSlot('');
    if (!doctorId || !date) { setSlots([]); return; }

    setLoadingSlots(true);
    api.get<string[]>(`/doctors/${doctorId}/availability`, { params: { date } })
      .then((r) => setSlots(r.data))
      .catch(() => toast.error('Error al cargar horarios disponibles'))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const confirm = async () => {
    if (!doctorId || !selectedSlot) return;

    setSubmitting(true);
    try {
      await api.post('/appointments', { doctorId, scheduledAt: selectedSlot, notes: notes || undefined });
      toast.success('Turno reservado');
      router.push('/patient/appointments');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'No se pudo reservar el turno');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Agendar Turno</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Elegí especialidad, médico, fecha y horario</p>
      </div>

      {loadingDoctors ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Especialidad */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">1. Especialidad</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setSpecialty(''); setDoctorId(''); }}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                  specialty === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted',
                )}
              >
                Todas
              </button>
              {specialties.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSpecialty(s); setDoctorId(''); }}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                    specialty === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/60 text-muted-foreground hover:bg-muted',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Médico */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">2. Médico</h2>
            {filteredDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay médicos disponibles</p>
            ) : (
              <div className="space-y-2">
                {filteredDoctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setDoctorId(doc.id)}
                    className={cn(
                      'w-full text-left bg-card rounded-2xl border p-4 shadow-sm transition-colors',
                      doctorId === doc.id ? 'border-primary ring-1 ring-primary' : 'border-border/60 hover:bg-muted/40',
                    )}
                  >
                    <p className="font-semibold text-foreground text-sm">{doc.firstName} {doc.lastName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.specialty} · Mat. {doc.licenseNumber}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Fecha y horario */}
          {doctorId && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">3. Fecha y horario</h2>
              <Input
                type="date"
                value={date}
                min={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-44 h-10 rounded-xl text-sm mb-3"
              />

              {loadingSlots ? (
                <div className="h-16 rounded-2xl bg-muted animate-pulse" />
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'text-sm font-medium px-2 py-2 rounded-xl border transition-colors',
                        selectedSlot === slot ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/60 hover:bg-muted/40',
                      )}
                    >
                      {new Date(slot).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Notas */}
          {selectedSlot && (
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-2">4. Motivo de consulta (opcional)</h2>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Contanos brevemente el motivo de tu consulta"
                className="rounded-xl"
              />
            </section>
          )}

          {selectedSlot && (
            <Button onClick={confirm} disabled={submitting}
              className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-sm h-11">
              {submitting ? 'Reservando...' : 'Confirmar turno'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
