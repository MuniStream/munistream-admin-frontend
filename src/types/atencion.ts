export type EstadoAtencion = 'abierta' | 'respondida' | 'cerrada';
export type CategoriaAtencion = 'duda_tramite' | 'problema_tecnico' | 'queja' | 'sugerencia' | 'otro';

export interface MensajeAtencion {
  autor: 'ciudadano' | 'personal';
  autor_id: string;
  autor_nombre?: string | null;
  texto: string;
  fecha: string;
}

export interface SolicitudAtencion {
  solicitud_id: string;
  folio: string;
  asunto: string;
  categoria: CategoriaAtencion;
  estado: EstadoAtencion;
  instance_id?: string | null;
  workflow_id?: string | null;
  asignado_a?: string | null;
  mensajes: MensajeAtencion[];
  created_at: string;
  updated_at: string;
  primera_respuesta_at?: string | null;
  solicitante?: string | null;
}

export interface BandejaAtencion {
  conteo: Record<EstadoAtencion, number>;
  horas_promedio_primera_respuesta: number | null;
  solicitudes: SolicitudAtencion[];
}

export interface Satisfaccion {
  total: number;
  promedio: number | null;
  distribucion: Record<string, number>;
  comentarios: { instance_id: string; workflow_id: string; calificacion: number; comentario: string; created_at: string }[];
}
