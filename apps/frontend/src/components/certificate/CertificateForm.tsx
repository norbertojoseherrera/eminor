'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CertificateType } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TYPE_LABELS: Record<CertificateType, string> = {
  ATTENDANCE: 'Certificado de Asistencia',
  REST: 'Certificado de Reposo',
  FITNESS: 'Certificado de Aptitud Física',
  OTHER: 'Otro',
};

interface Props {
  appointmentId: string;
  completed: boolean;
  onComplete: () => Promise<void>;
}

export function CertificateForm({ appointmentId, completed, onComplete }: Props) {
  const [type, setType] = useState<CertificateType>('ATTENDANCE');
  const [content, setContent] = useState('');
  const [restDays, setRestDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [issued, setIssued] = useState(false);

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
    if (content.trim().length < 10) {
      toast.error('El contenido debe tener al menos 10 caracteres');
      return;
    }
    setSaving(true);
    try {
      await api.post('/certificates', {
        appointmentId,
        type,
        content: content.trim(),
        ...(type === 'REST' && restDays ? { restDays: Number(restDays) } : {}),
      });
      setIssued(true);
      toast.success('Certificado emitido y firmado');
    } catch {
      toast.error('Error al emitir el certificado');
    } finally {
      setSaving(false);
    }
  };

  if (issued) {
    return (
      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
        <div className="text-3xl mb-2">📜</div>
        <p className="font-semibold text-emerald-800">Certificado emitido</p>
        <p className="text-sm text-emerald-600 mt-1">El paciente ya puede verlo en &quot;Mis Certificados&quot;</p>
      </div>
    );
  }

  if (!completed) {
    return (
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <p className="text-sm text-amber-800">
          Para emitir un certificado primero hay que finalizar la consulta.
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
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground/80">Tipo de certificado</Label>
        <Select value={type} onValueChange={(v) => setType(v as CertificateType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo">
              {(value: CertificateType) => TYPE_LABELS[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as CertificateType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground/80">Contenido</Label>
        <Textarea
          rows={4}
          placeholder="Detalle del certificado..."
          className="rounded-xl text-sm resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {type === 'REST' && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground/80">Días de reposo</Label>
          <Input
            type="number"
            min={1}
            className="rounded-xl h-9 text-sm"
            value={restDays}
            onChange={(e) => setRestDays(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full rounded-xl bg-primary hover:bg-primary/90 h-11">
        {saving ? 'Emitiendo...' : 'Emitir y firmar certificado'}
      </Button>
    </form>
  );
}
