'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Study } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PatientStudiesPage() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const patientId = user?.patient?.id;

  useEffect(() => {
    if (!patientId) return;
    api.get<Study[]>(`/studies/patient/${patientId}`)
      .then((r) => setStudies(r.data))
      .catch(() => toast.error('Error al cargar estudios'));
  }, [patientId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !patientId || !title.trim()) {
      toast.error('Completá el título y seleccioná un archivo');
      return;
    }

    const ext = file.name.split('.').pop()?.toUpperCase();
    if (!['PDF', 'JPG', 'JPEG', 'PNG'].includes(ext ?? '')) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG');
      return;
    }

    const fileType = ext === 'JPEG' ? 'JPG' : (ext as 'PDF' | 'JPG' | 'PNG');

    setUploading(true);
    try {
      const { data } = await api.post('/studies/presigned-url', {
        patientId,
        title,
        fileName: file.name,
        fileType,
      });

      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      toast.success('Estudio subido correctamente');
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';

      const r = await api.get<Study[]>(`/studies/patient/${patientId}`);
      setStudies(r.data);
    } catch {
      toast.error('Error al subir el estudio');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (studyId: string) => {
    try {
      const { data } = await api.get<{ url: string }>(`/studies/${studyId}/download-url`);
      window.open(data.url, '_blank');
    } catch {
      toast.error('No se pudo obtener el enlace de descarga');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis Estudios</h1>
        <p className="text-muted-foreground">Administrá tus archivos médicos</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Subir nuevo estudio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Título del estudio</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Análisis de sangre completo" />
          </div>
          <div className="space-y-1">
            <Label>Archivo (PDF, JPG, PNG)</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={fileRef} />
          </div>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Subiendo...' : 'Subir estudio'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {studies.map((study) => (
          <Card key={study.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{study.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(study.uploadedAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{study.fileType}</Badge>
                <Button variant="outline" size="sm" onClick={() => handleDownload(study.id)}>
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {studies.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No tenés estudios subidos todavía.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
