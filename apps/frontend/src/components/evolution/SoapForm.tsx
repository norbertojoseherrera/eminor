'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const schema = z.object({
  subjective: z.string().min(10, 'Mínimo 10 caracteres'),
  objective: z.string().min(5, 'Mínimo 5 caracteres'),
  assessmentText: z.string().min(5, 'Mínimo 5 caracteres'),
  plan: z.string().min(5, 'Mínimo 5 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  appointmentId: string;
  onSaved?: (evolutionId: string) => void;
}

export function SoapForm({ appointmentId, onSaved }: Props) {
  const [cie10Input, setCie10Input] = useState('');
  const [cie10Codes, setCie10Codes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [evolutionId, setEvolutionId] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const addCie10 = () => {
    const code = cie10Input.trim().toUpperCase();
    if (!/^[A-Z]\d{2}(\.\d)?$/.test(code)) {
      toast.error('Código CIE-10 inválido. Ej: J18.9 o A09');
      return;
    }
    if (!cie10Codes.includes(code)) {
      setCie10Codes([...cie10Codes, code]);
    }
    setCie10Input('');
  };

  const onSubmit = async (data: FormData) => {
    if (cie10Codes.length === 0) {
      toast.error('Agregá al menos un código CIE-10');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        appointmentId,
        soapData: {
          subjective: data.subjective,
          objective: data.objective,
          assessment: { text: data.assessmentText, cie10Codes },
          plan: data.plan,
        },
      };

      const res = await api.post<{ id: string }>('/evolutions', payload);
      setEvolutionId(res.data.id);
      toast.success('Evolución guardada. Podés firmarla para cerrarla.');
      onSaved?.(res.data.id);
    } catch {
      toast.error('Error al guardar la evolución');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!evolutionId) return;
    try {
      await api.patch(`/evolutions/${evolutionId}/sign`);
      setSigned(true);
      toast.success('Evolución firmada y sellada criptográficamente');
    } catch {
      toast.error('Error al firmar la evolución');
    }
  };

  if (signed) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
        <p className="text-green-700 font-medium">Evolución firmada y cerrada</p>
        <p className="text-sm text-green-600 mt-1">Registro inmutable según Ley 26.529</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label className="text-xs font-semibold uppercase text-blue-600 tracking-wide">S — Subjetivo</Label>
        <Textarea
          className="mt-1"
          placeholder="Motivo de consulta, síntomas referidos por el paciente..."
          rows={3}
          {...register('subjective')}
          disabled={!!evolutionId}
        />
        {errors.subjective && <p className="text-xs text-red-500 mt-1">{errors.subjective.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-blue-600 tracking-wide">O — Objetivo</Label>
        <Textarea
          className="mt-1"
          placeholder="Signos vitales, hallazgos del examen físico..."
          rows={3}
          {...register('objective')}
          disabled={!!evolutionId}
        />
        {errors.objective && <p className="text-xs text-red-500 mt-1">{errors.objective.message}</p>}
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-blue-600 tracking-wide">A — Análisis / Diagnóstico</Label>
        <Textarea
          className="mt-1"
          placeholder="Impresión diagnóstica..."
          rows={2}
          {...register('assessmentText')}
          disabled={!!evolutionId}
        />
        {errors.assessmentText && <p className="text-xs text-red-500 mt-1">{errors.assessmentText.message}</p>}

        <div className="flex gap-2 mt-2">
          <Input
            value={cie10Input}
            onChange={(e) => setCie10Input(e.target.value)}
            placeholder="Código CIE-10 (ej: J18.9)"
            className="text-sm"
            disabled={!!evolutionId}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCie10())}
          />
          <Button type="button" variant="outline" size="sm" onClick={addCie10} disabled={!!evolutionId}>
            + CIE-10
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {cie10Codes.map((code) => (
            <Badge key={code} variant="secondary" className="text-xs">
              {code}
              {!evolutionId && (
                <button type="button" className="ml-1 text-red-400 hover:text-red-600" onClick={() => setCie10Codes(cie10Codes.filter((c) => c !== code))}>×</button>
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-blue-600 tracking-wide">P — Plan</Label>
        <Textarea
          className="mt-1"
          placeholder="Indicaciones, medicamentos, estudios solicitados..."
          rows={3}
          {...register('plan')}
          disabled={!!evolutionId}
        />
        {errors.plan && <p className="text-xs text-red-500 mt-1">{errors.plan.message}</p>}
      </div>

      <div className="flex gap-3">
        {!evolutionId && (
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? 'Guardando...' : 'Guardar evolución'}
          </Button>
        )}
        {evolutionId && !signed && (
          <Button type="button" onClick={handleSign} className="flex-1 bg-green-600 hover:bg-green-700">
            Firmar y cerrar (Ley 26.529)
          </Button>
        )}
      </div>
    </form>
  );
}
