'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Study } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PatientStudiesPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const patientId = user?.patient?.id;

  const loadStudies = () => {
    if (!patientId) return;
    api.get<Study[]>(`/studies/patient/${patientId}`)
      .then((r) => setStudies(r.data))
      .catch(() => toast.error('Error al cargar estudios'));
  };

  useEffect(() => { loadStudies(); }, [patientId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !patientId || !title.trim()) { toast.error('Completá el título y seleccioná un archivo'); return; }
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (!['PDF', 'JPG', 'JPEG', 'PNG'].includes(ext ?? '')) { toast.error('Solo PDF, JPG o PNG'); return; }
    const fileType = ext === 'JPEG' ? 'JPG' : (ext as 'PDF' | 'JPG' | 'PNG');
    setUploading(true);
    try {
      const { data } = await api.post('/studies/presigned-url', { patientId, title, fileName: file.name, fileType });
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      toast.success('Estudio subido correctamente');
      setTitle(''); if (fileRef.current) fileRef.current.value = '';
      loadStudies();
    } catch { toast.error('Error al subir el estudio'); } finally { setUploading(false); }
  };

  const download = async (studyId: string) => {
    try {
      const { data } = await api.get<{ url: string }>(`/studies/${studyId}/download-url`);
      window.open(data.url, '_blank');
    } catch { toast.error('No se pudo obtener el enlace'); }
  };

  const FILE_ICONS: Record<string, string> = { PDF: '📄', JPG: '🖼️', PNG: '🖼️' };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Mis Estudios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Archivos clínicos y diagnósticos</p>
      </div>

      {/* Upload form */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 mb-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <span>📎</span> Subir nuevo estudio
        </h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Título del estudio</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Análisis de sangre completo" className="mt-1 h-10 rounded-xl text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Archivo (PDF, JPG, PNG)</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={fileRef} className="mt-1 h-10 rounded-xl text-sm" />
          </div>
          <Button onClick={handleUpload} disabled={uploading}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 h-10 text-sm">
            {uploading ? 'Subiendo...' : 'Subir estudio'}
          </Button>
        </div>
      </div>

      {/* List */}
      {studies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium">No hay estudios cargados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {studies.map((s) => (
            <div key={s.id} className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-2xl shrink-0">{FILE_ICONS[s.fileType] ?? '📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.uploadedAt).toLocaleDateString('es-AR')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => download(s.id)}
                className="rounded-xl text-xs h-8 shrink-0">
                Descargar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
