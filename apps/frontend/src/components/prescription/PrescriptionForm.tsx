'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { searchVademecum, type VademecumItem } from '@/lib/vademecum';
import { MedicationItem, Prescription } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  appointmentId: string;
  completed: boolean;
  evolutionSaved: boolean;
  onComplete: () => Promise<void>;
  onGoToSoap?: () => void;
}

const emptyMedication = (): MedicationItem => ({ name: '', dose: '', frequency: '', duration: '', notes: '' });

export function PrescriptionForm({ appointmentId, completed, evolutionSaved, onComplete, onGoToSoap }: Props) {
  const [medications, setMedications] = useState<MedicationItem[]>([emptyMedication()]);
  const [instructions, setInstructions] = useState('');
  const [suggestions, setSuggestions] = useState<VademecumItem[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [issued, setIssued] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!completed) {
      setChecking(false);
      return;
    }
    api.get<Prescription | null>(`/prescriptions/appointment/${appointmentId}`)
      .then((r) => { if (r.data) setIssued(true); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [appointmentId, completed]);

  const updateMedication = (index: number, patch: Partial<MedicationItem>) => {
    setMedications((meds) => meds.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleNameChange = (index: number, value: string) => {
    updateMedication(index, { name: value });
    setSuggestions(searchVademecum(value));
    setOpenIndex(value.trim().length >= 2 ? index : null);
  };

  const pickSuggestion = (index: number, item: VademecumItem) => {
    updateMedication(index, { name: item.name, dose: item.dose, frequency: item.frequency, duration: item.duration });
    setOpenIndex(null);
  };

  const addMedication = () => setMedications((meds) => [...meds, emptyMedication()]);
  const removeMedication = (index: number) => setMedications((meds) => meds.filter((_, i) => i !== index));

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete();
    } catch {
      toast.error('Error al finalizar la consulta');
    } finally {
      setCompleting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = medications.every((m) => m.name.trim() && m.dose.trim() && m.frequency.trim() && m.duration.trim());
    if (!valid) {
      toast.error('Completá medicamento, dosis, frecuencia y duración para cada ítem');
      return;
    }
    setSaving(true);
    try {
      await api.post('/prescriptions', {
        appointmentId,
        medicationPayload: {
          medications: medications.map((m) => ({
            name: m.name.trim(),
            dose: m.dose.trim(),
            frequency: m.frequency.trim(),
            duration: m.duration.trim(),
            ...(m.notes?.trim() ? { notes: m.notes.trim() } : {}),
          })),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        },
      });
      setIssued(true);
      toast.success('Receta emitida y firmada');
    } catch {
      toast.error('Error al emitir la receta');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (issued) {
    return (
      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
        <div className="text-3xl mb-2">💊</div>
        <p className="font-semibold text-emerald-800">Receta emitida</p>
        <p className="text-sm text-emerald-600 mt-1">El paciente ya puede verla en &quot;Mis Recetas&quot;</p>
      </div>
    );
  }

  if (!completed) {
    if (!evolutionSaved) {
      return (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
          <p className="text-sm text-amber-800">
            Para finalizar la consulta primero hay que completar y guardar la evolución SOAP.
          </p>
          {onGoToSoap && (
            <Button type="button" variant="outline" onClick={onGoToSoap} className="rounded-xl">
              Ir a Evolución SOAP
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <p className="text-sm text-amber-800">
          Para generar una receta primero hay que finalizar la consulta.
        </p>
        <Button type="button" onClick={handleComplete} disabled={completing}
          className="rounded-xl bg-primary hover:bg-primary/90">
          {completing ? 'Finalizando...' : 'Finalizar consulta'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Escribí 2-3 letras del medicamento para ver sugerencias del vademécum (dosis, frecuencia y duración habituales). Podés editar todos los campos.
      </p>

      {medications.map((med, index) => (
        <div key={index} className="p-3 border border-border rounded-xl space-y-2 relative">
          {medications.length > 1 && (
            <button type="button" onClick={() => removeMedication(index)}
              className="absolute top-2 right-2 text-xs text-rose-500 hover:text-rose-700">
              Quitar
            </button>
          )}

          <div className="space-y-1 relative">
            <Label className="text-xs font-semibold text-foreground/80">Medicamento</Label>
            <Input
              value={med.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              onFocus={() => { if (med.name.trim().length >= 2) { setSuggestions(searchVademecum(med.name)); setOpenIndex(index); } }}
              onBlur={() => setTimeout(() => setOpenIndex((i) => (i === index ? null : i)), 150)}
              placeholder="Ej: Amoxicilina..."
              className="rounded-xl h-9 text-sm"
              autoComplete="off"
            />
            {openIndex === index && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-xl shadow-md max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => pickSuggestion(index, s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80">Dosis</Label>
              <Input value={med.dose} onChange={(e) => updateMedication(index, { dose: e.target.value })}
                placeholder="500 mg" className="rounded-xl h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80">Frecuencia</Label>
              <Input value={med.frequency} onChange={(e) => updateMedication(index, { frequency: e.target.value })}
                placeholder="Cada 8 horas" className="rounded-xl h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80">Duración</Label>
              <Input value={med.duration} onChange={(e) => updateMedication(index, { duration: e.target.value })}
                placeholder="7 días" className="rounded-xl h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground/80">Notas (opcional)</Label>
            <Input value={med.notes ?? ''} onChange={(e) => updateMedication(index, { notes: e.target.value })}
              placeholder="Ej: Tomar con las comidas" className="rounded-xl h-9 text-sm" />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addMedication} className="w-full rounded-xl h-9 text-sm">
        + Agregar medicamento
      </Button>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground/80">Indicaciones generales (opcional)</Label>
        <Textarea
          rows={3}
          placeholder="Indicaciones adicionales para el paciente..."
          className="rounded-xl text-sm resize-none"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full rounded-xl bg-primary hover:bg-primary/90 h-11">
        {saving ? 'Emitiendo...' : 'Emitir y firmar receta'}
      </Button>
    </form>
  );
}
