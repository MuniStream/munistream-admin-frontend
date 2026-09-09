/**
 * Un solo mapa de estado a apariencia.
 *
 * Había doce implementaciones de esto repartidas por el proyecto, y no coincidían:
 * `running` era «primario» en la bandeja e «información» en asignaciones;
 * `in_progress` era «primario» en una pantalla y «aviso» en otra. El mismo
 * trámite cambiaba de color según dónde se mirara.
 *
 * Criterio, para que no vuelva a decidirse caso por caso:
 *
 * - **en curso → información.** Algo que avanza no es una advertencia.
 * - **esperando algo → aviso.** Requiere que alguien actúe.
 * - **terminado bien → éxito**, **terminado mal → error**.
 * - **inerte (borrador, cancelado, sin asignar) → neutro.**
 *
 * El acento del organismo nunca comunica estado: se reserva a las acciones. Si
 * un estado se pintara con el acento, un chip informativo parecería un botón.
 */

export type Tono = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Estado → tono. Lo que no esté aquí cae en neutro, que es lo prudente. */
export const MAPA_ESTADO: Record<string, Tono> = {
  // En curso
  running: 'info',
  in_progress: 'info',
  active: 'info',
  under_review: 'info',

  // Esperando a alguien
  paused: 'warning',
  awaiting_input: 'warning',
  pending: 'warning',
  pending_review: 'warning',
  pending_validation: 'warning',
  pending_assignment: 'warning',
  pending_signature: 'warning',
  waiting: 'warning',
  waiting_for_start: 'warning',
  modification_requested: 'warning',
  on_hold: 'warning',
  escalated: 'warning',

  // Terminado bien
  completed: 'success',
  approved_by_reviewer: 'success',

  // Terminado mal
  failed: 'error',
  rejected: 'error',
  suspended: 'error',

  // Inerte
  draft: 'neutral',
  cancelled: 'neutral',
  archived: 'neutral',
  inactive: 'neutral',
  unassigned: 'neutral',
  none: 'neutral',
};

export function tonoDe(estado?: string | null): Tono {
  if (!estado) return 'neutral';
  return MAPA_ESTADO[estado] ?? 'neutral';
}

/**
 * Clave de traducción del estado.
 *
 * Las etiquetas estaban duplicadas en tres sitios y con el español incrustado,
 * pese a que la aplicación tiene traducciones.
 */
export function claveDe(estado: string): string {
  return `analytics.status.${estado}`;
}
