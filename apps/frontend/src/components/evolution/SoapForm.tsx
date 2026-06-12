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

const schema = z.object({
  subjective: z.string().min(10, 'Mínimo 10 caracteres'),
  objective: z.string().min(5, 'Mínimo 5 caracteres'),
  assessmentText: z.string().min(5, 'Mínimo 5 caracteres'),
  plan: z.string().min(5, 'Mínimo 5 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  appointmentId: string;
  reasonNotes?: string;
  specialty?: string;
  onSaved?: (evolutionId: string) => void;
}

const DEFAULT_TEMPLATES: Record<string, { objective: string; assessment: string; plan: string }> = {
  'Pediatría': {
    objective: 'Buen estado general, activo/a y reactivo/a. Peso, talla y signos vitales acordes a la edad. Examen físico por aparatos sin hallazgos patológicos significativos.',
    assessment: 'Paciente pediátrico en buen estado general. Sin signos de alarma al momento de la consulta.',
    plan: 'Continuar controles de rutina según calendario. Pautas de alarma indicadas a los padres/tutores. Reconsultar ante fiebre persistente, decaimiento o empeoramiento de síntomas.',
  },
  'Traumatología': {
    objective: 'Marcha conservada. Sin deformidades visibles. Movilidad articular dentro de rangos esperables, con dolor referido a la palpación en la zona afectada.',
    assessment: 'Cuadro compatible con afección osteoarticular/muscular de tipo mecánico, a confirmar con estudios complementarios si corresponde.',
    plan: 'Reposo relativo de la zona afectada, frío local, analgesia según indicación. Solicitar estudios por imágenes si no hay mejoría. Control en 7 a 10 días.',
  },
  'Cardiología': {
    objective: 'Ruidos cardíacos regulares, sin soplos audibles. Tensión arterial y frecuencia cardíaca dentro de parámetros normales. Sin signos de insuficiencia cardíaca.',
    assessment: 'Paciente cardiovascularmente estable al momento de la consulta.',
    plan: 'Continuar tratamiento habitual. Control de factores de riesgo cardiovascular (dieta, actividad física, adherencia a medicación). Próximo control según indicación.',
  },
  'Dermatología': {
    objective: 'Lesión/es cutánea/s descripta/s por el paciente, sin signos de sobreinfección al momento del examen.',
    assessment: 'Cuadro dermatológico a evaluar evolución, sin signos de gravedad actual.',
    plan: 'Indicaciones de cuidado local de la piel, fotoprotección y tratamiento tópico según corresponda. Control en caso de no mejoría en 1-2 semanas.',
  },
  'Ginecología': {
    objective: 'Examen físico sin hallazgos relevantes al momento de la consulta. Signos vitales normales.',
    assessment: 'Sin hallazgos de alarma al momento de la consulta.',
    plan: 'Continuar controles ginecológicos de rutina. Pautas de alarma indicadas. Próximo control programado.',
  },
  default: {
    objective: 'Buen estado general. Signos vitales dentro de parámetros normales. Examen físico sin hallazgos patológicos significativos.',
    assessment: 'Paciente en buen estado general al momento de la consulta, sin signos de alarma.',
    plan: 'Continuar con las indicaciones habituales. Pautas de alarma brindadas al paciente. Control según evolución de los síntomas.',
  },
};

const SoapSection = ({ label, letter, color, children }: { label: string; letter: string; color: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-xs font-bold text-white ${color}`}>{letter}</span>
      <Label className="text-sm font-semibold text-foreground/80">{label}</Label>
    </div>
    {children}
  </div>
);

export function SoapForm({ appointmentId, reasonNotes, specialty, onSaved }: Props) {
  const [cie10Input, setCie10Input] = useState('');
  const [cie10Codes, setCie10Codes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [evolutionId, setEvolutionId] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const applySuggestions = () => {
    const templates = DEFAULT_TEMPLATES[specialty ?? ''] ?? DEFAULT_TEMPLATES.default;
    const values = getValues();

    if (!values.subjective?.trim()) {
      setValue(
        'subjective',
        reasonNotes?.trim()
          ? `Paciente consulta por: ${reasonNotes.trim()}.`
          : 'Paciente refiere síntomas que motivan la consulta. Sin antecedentes relevantes referidos.',
        { shouldValidate: true },
      );
    }
    if (!values.objective?.trim()) {
      setValue('objective', templates.objective, { shouldValidate: true });
    }
    if (!values.assessmentText?.trim()) {
      setValue('assessmentText', templates.assessment, { shouldValidate: true });
    }
    if (!values.plan?.trim()) {
      setValue('plan', templates.plan, { shouldValidate: true });
    }
  };

  const addCie10 = () => {
    const code = cie10Input.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(code)) {
      toast.error('Código CIE-10 inválido. Ej: J18.9 o A09');
      return;
    }
    if (cie10Codes.includes(code)) {
      toast.error('Ese código ya fue agregado');
      return;
    }
    setCie10Codes([...cie10Codes, code]);
    setCie10Input('');
    toast.success(`Código ${code} agregado`);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>('/evolutions', {
        appointmentId,
        soapData: {
          subjective: data.subjective, objective: data.objective,
          assessment: { text: data.assessmentText, cie10Codes },
          plan: data.plan,
        },
      });
      setEvolutionId(res.data.id);
      toast.success('Evolución guardada correctamente');
      onSaved?.(res.data.id);
    } catch (err) {
      const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join('. ') : raw;
      toast.error(message ?? 'Error al guardar la evolución');
    } finally { setSaving(false); }
  };

  const handleSign = async () => {
    if (!evolutionId) return;
    try {
      await api.patch(`/evolutions/${evolutionId}/sign`);
      setSigned(true);
      toast.success('Evolución firmada y sellada — Ley 26.529');
    } catch { toast.error('Error al firmar'); }
  };

  if (signed) return (
    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
      <div className="text-3xl mb-2">✅</div>
      <p className="font-semibold text-emerald-800">Evolución firmada y cerrada</p>
      <p className="text-sm text-emerald-600 mt-1">Registro inmutable — Ley 26.529</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {!evolutionId && (
        <div className="flex items-start justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700">
            Completá los campos vacíos con texto sugerido en base al motivo de consulta
            {specialty ? ` y la especialidad (${specialty})` : ''}. Podés editarlo libremente.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={applySuggestions}
            className="rounded-xl h-8 text-xs shrink-0 bg-white">
            💡 Sugerir texto
          </Button>
        </div>
      )}

      <SoapSection label="Subjetivo" letter="S" color="bg-amber-500">
        <Textarea placeholder="Motivo de consulta, síntomas referidos por el paciente..." rows={3}
          className="rounded-xl text-sm resize-none" {...register('subjective')} disabled={!!evolutionId} />
        {errors.subjective && <p className="text-xs text-destructive">{errors.subjective.message}</p>}
      </SoapSection>

      <SoapSection label="Objetivo" letter="O" color="bg-orange-500">
        <Textarea placeholder="Signos vitales, hallazgos del examen físico..." rows={3}
          className="rounded-xl text-sm resize-none" {...register('objective')} disabled={!!evolutionId} />
        {errors.objective && <p className="text-xs text-destructive">{errors.objective.message}</p>}
      </SoapSection>

      <SoapSection label="Análisis / Diagnóstico" letter="A" color="bg-rose-500">
        <Textarea placeholder="Impresión diagnóstica..." rows={2}
          className="rounded-xl text-sm resize-none" {...register('assessmentText')} disabled={!!evolutionId} />
        {errors.assessmentText && <p className="text-xs text-destructive">{errors.assessmentText.message}</p>}
        <div className="flex gap-2">
          <Input value={cie10Input} onChange={(e) => setCie10Input(e.target.value)}
            placeholder="Código CIE-10 (ej: J18.9)" className="text-sm rounded-xl h-9"
            disabled={!!evolutionId}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCie10())} />
          <Button type="button" variant="outline" size="sm" onClick={addCie10} disabled={!!evolutionId}
            className="rounded-xl h-9 text-xs shrink-0">
            + CIE-10
          </Button>
        </div>
        {cie10Codes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cie10Codes.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                {c}
                {!evolutionId && (
                  <button type="button" onClick={() => setCie10Codes(cie10Codes.filter(x => x !== c))}
                    className="text-rose-400 hover:text-rose-600 leading-none">×</button>
                )}
              </span>
            ))}
          </div>
        )}
      </SoapSection>

      <SoapSection label="Plan de tratamiento" letter="P" color="bg-teal-500">
        <Textarea placeholder="Indicaciones, medicamentos, estudios solicitados..." rows={3}
          className="rounded-xl text-sm resize-none" {...register('plan')} disabled={!!evolutionId} />
        {errors.plan && <p className="text-xs text-destructive">{errors.plan.message}</p>}
      </SoapSection>

      <div className="pt-1">
        {!evolutionId && (
          <Button type="submit" disabled={saving} className="w-full rounded-xl bg-primary hover:bg-primary/90 h-11">
            {saving ? 'Guardando...' : 'Guardar evolución'}
          </Button>
        )}
        {evolutionId && !signed && (
          <Button type="button" onClick={handleSign}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 gap-2">
            <span>🔐</span> Firmar y cerrar (Ley 26.529)
          </Button>
        )}
      </div>
    </form>
  );
}
