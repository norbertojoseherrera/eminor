'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { DoctorAvailability } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SLOT_MINUTES = 15;

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface DayRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const emptyRow = (): DayRow => ({ enabled: false, startTime: '09:00', endTime: '17:00' });

export default function DoctorAvailabilityPage() {
  const [rows, setRows] = useState<Record<number, DayRow>>(() => {
    const initial: Record<number, DayRow> = {};
    DAYS.forEach((d) => { initial[d.value] = emptyRow(); });
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<DoctorAvailability[]>('/doctors/me/availability')
      .then((r) => {
        setRows((prev) => {
          const next = { ...prev };
          for (const item of r.data) {
            next[item.dayOfWeek] = {
              enabled: true,
              startTime: item.startTime,
              endTime: item.endTime,
            };
          }
          return next;
        });
      })
      .catch(() => toast.error('Error al cargar disponibilidad'))
      .finally(() => setLoading(false));
  }, []);

  const updateRow = (day: number, patch: Partial<DayRow>) => {
    setRows((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const save = async () => {
    const schedule = DAYS
      .filter((d) => rows[d.value].enabled)
      .map((d) => ({
        dayOfWeek: d.value,
        startTime: rows[d.value].startTime,
        endTime: rows[d.value].endTime,
        slotMinutes: SLOT_MINUTES,
      }));

    if (schedule.some((s) => s.startTime >= s.endTime)) {
      toast.error('El horario "Desde" debe ser anterior al "Hasta"');
      return;
    }

    setSaving(true);
    try {
      await api.put('/doctors/me/availability', { schedule });
      toast.success('Disponibilidad actualizada');
    } catch {
      toast.error('No se pudo guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Mi Disponibilidad</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Definí tus horarios de atención semanales. Los turnos se generan cada {SLOT_MINUTES} minutos.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((day) => {
            const row = rows[day.value];
            return (
              <div key={day.value} className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3 sm:mb-0 sm:flex-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => updateRow(day.value, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="font-medium text-foreground text-sm w-20">{day.label}</span>
                  </label>

                  {row.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={row.startTime}
                        onChange={(e) => updateRow(day.value, { startTime: e.target.value })}
                        className="w-28 h-9 rounded-xl text-sm"
                      />
                      <span className="text-muted-foreground text-sm">a</span>
                      <Input
                        type="time"
                        value={row.endTime}
                        onChange={(e) => updateRow(day.value, { endTime: e.target.value })}
                        className="w-28 h-9 rounded-xl text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Button onClick={save} disabled={saving}
            className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-sm h-10 mt-2">
            {saving ? 'Guardando...' : 'Guardar disponibilidad'}
          </Button>
        </div>
      )}
    </div>
  );
}
