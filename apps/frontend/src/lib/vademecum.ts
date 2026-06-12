// Listado simplificado de medicamentos de uso frecuente en Argentina (nombres genéricos
// según vademécum ANMAT) con dosis/frecuencia/duración habituales sugeridas.
// Uso: autocompletado al prescribir — el médico puede editar libremente los valores.

export interface VademecumItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export const VADEMECUM: VademecumItem[] = [
  { name: 'Paracetamol 500mg', dose: '500-1000 mg', frequency: 'Cada 6-8 horas', duration: '3-5 días' },
  { name: 'Paracetamol gotas pediátrico', dose: '10-15 mg/kg', frequency: 'Cada 6 horas', duration: '3-5 días' },
  { name: 'Ibuprofeno 400mg', dose: '400 mg', frequency: 'Cada 8 horas', duration: '3-5 días' },
  { name: 'Ibuprofeno 600mg', dose: '600 mg', frequency: 'Cada 8 horas', duration: '3-5 días' },
  { name: 'Diclofenac 75mg', dose: '75 mg', frequency: 'Cada 12 horas', duration: '3-5 días' },
  { name: 'Amoxicilina 500mg', dose: '500 mg', frequency: 'Cada 8 horas', duration: '7 días' },
  { name: 'Amoxicilina/Ácido Clavulánico 875mg', dose: '875/125 mg', frequency: 'Cada 12 horas', duration: '7-10 días' },
  { name: 'Azitromicina 500mg', dose: '500 mg', frequency: '1 vez al día', duration: '3 días' },
  { name: 'Ciprofloxacina 500mg', dose: '500 mg', frequency: 'Cada 12 horas', duration: '7 días' },
  { name: 'Cefalexina 500mg', dose: '500 mg', frequency: 'Cada 6-8 horas', duration: '7 días' },
  { name: 'Claritromicina 500mg', dose: '500 mg', frequency: 'Cada 12 horas', duration: '7 días' },
  { name: 'Omeprazol 20mg', dose: '20 mg', frequency: '1 vez al día (en ayunas)', duration: '14 días' },
  { name: 'Pantoprazol 40mg', dose: '40 mg', frequency: '1 vez al día (en ayunas)', duration: '14 días' },
  { name: 'Loratadina 10mg', dose: '10 mg', frequency: '1 vez al día', duration: '7 días' },
  { name: 'Cetirizina 10mg', dose: '10 mg', frequency: '1 vez al día', duration: '7 días' },
  { name: 'Betametasona crema', dose: 'Aplicar capa fina', frequency: 'Cada 12 horas', duration: '7 días' },
  { name: 'Hidrocortisona crema 1%', dose: 'Aplicar capa fina', frequency: 'Cada 12 horas', duration: '7 días' },
  { name: 'Salbutamol aerosol 100mcg', dose: '2 puff (200 mcg)', frequency: 'Cada 6-8 horas / según necesidad', duration: 'Según indicación' },
  { name: 'Budesonide aerosol', dose: '2 puff', frequency: 'Cada 12 horas', duration: 'Según indicación' },
  { name: 'Losartán 50mg', dose: '50 mg', frequency: '1 vez al día', duration: 'Tratamiento crónico' },
  { name: 'Enalapril 10mg', dose: '10 mg', frequency: '1 vez al día', duration: 'Tratamiento crónico' },
  { name: 'Amlodipina 5mg', dose: '5 mg', frequency: '1 vez al día', duration: 'Tratamiento crónico' },
  { name: 'Atorvastatina 20mg', dose: '20 mg', frequency: '1 vez al día (por la noche)', duration: 'Tratamiento crónico' },
  { name: 'Metformina 850mg', dose: '850 mg', frequency: 'Cada 12 horas (con las comidas)', duration: 'Tratamiento crónico' },
  { name: 'Levotiroxina 50mcg', dose: '50 mcg', frequency: '1 vez al día (en ayunas)', duration: 'Tratamiento crónico' },
  { name: 'Ácido acetilsalicílico 100mg', dose: '100 mg', frequency: '1 vez al día', duration: 'Tratamiento crónico' },
  { name: 'Clonazepam 0.5mg', dose: '0.5 mg', frequency: 'Por la noche', duration: 'Según indicación' },
  { name: 'Alprazolam 0.5mg', dose: '0.5 mg', frequency: 'Cada 12-24 horas', duration: 'Según indicación' },
  { name: 'Sertralina 50mg', dose: '50 mg', frequency: '1 vez al día (por la mañana)', duration: 'Tratamiento prolongado' },
  { name: 'Ranitidina 300mg', dose: '300 mg', frequency: '1 vez al día (por la noche)', duration: '14 días' },
  { name: 'Butilescopolamina 10mg', dose: '10 mg', frequency: 'Cada 8 horas', duration: '3-5 días' },
  { name: 'Loperamida 2mg', dose: '2 mg', frequency: 'Después de cada deposición líquida', duration: '1-2 días' },
  { name: 'Domperidona 10mg', dose: '10 mg', frequency: 'Cada 8 horas (antes de las comidas)', duration: '5-7 días' },
  { name: 'Ondansetrón 8mg', dose: '8 mg', frequency: 'Cada 8 horas', duration: '1-3 días' },
  { name: 'Dexametasona 4mg', dose: '4 mg', frequency: '1 vez al día', duration: '3-5 días' },
  { name: 'Prednisona 20mg', dose: '20 mg', frequency: '1 vez al día (por la mañana)', duration: '5-7 días' },
  { name: 'Meloxicam 15mg', dose: '15 mg', frequency: '1 vez al día', duration: '5-7 días' },
  { name: 'Naproxeno 550mg', dose: '550 mg', frequency: 'Cada 12 horas', duration: '3-5 días' },
  { name: 'Tramadol 50mg', dose: '50 mg', frequency: 'Cada 8 horas', duration: '3-5 días' },
  { name: 'Complejo B (vitaminas del grupo B)', dose: '1 comprimido', frequency: '1 vez al día', duration: '30 días' },
  { name: 'Ácido fólico 1mg', dose: '1 mg', frequency: '1 vez al día', duration: '30 días' },
  { name: 'Sulfato ferroso', dose: '300 mg', frequency: '1 vez al día (en ayunas)', duration: '30-90 días' },
  { name: 'Vitamina D 1000UI', dose: '1000 UI', frequency: '1 vez al día', duration: '30 días' },
  { name: 'Amoxicilina suspensión pediátrica 250mg/5ml', dose: '50 mg/kg/día', frequency: 'Cada 8 horas', duration: '7-10 días' },
  { name: 'Ibuprofeno suspensión pediátrica 4%', dose: '5-10 mg/kg', frequency: 'Cada 6-8 horas', duration: '3-5 días' },
  { name: 'Difenhidramina 25mg', dose: '25 mg', frequency: 'Cada 8 horas / por la noche', duration: '5-7 días' },
  { name: 'Furosemida 40mg', dose: '40 mg', frequency: '1 vez al día (por la mañana)', duration: 'Según indicación' },
  { name: 'Clopidogrel 75mg', dose: '75 mg', frequency: '1 vez al día', duration: 'Tratamiento crónico' },
  { name: 'Diazepam 5mg', dose: '5 mg', frequency: 'Según necesidad', duration: 'Según indicación' },
  { name: 'Fluconazol 150mg', dose: '150 mg', frequency: 'Dosis única', duration: 'Dosis única' },
];

export function searchVademecum(query: string, limit = 8): VademecumItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return VADEMECUM.filter((item) => item.name.toLowerCase().includes(q)).slice(0, limit);
}
