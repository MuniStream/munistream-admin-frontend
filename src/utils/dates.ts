/**
 * Fechas que llegan de la API.
 *
 * El backend serializa marcas de tiempo **UTC sin zona horaria**
 * (`2026-09-09T14:47:30.640000`). `new Date(...)` interpreta esa forma como
 * hora *local*, así que en México la fecha queda seis horas en el futuro y los
 * cálculos de antigüedad salen negativos ("asignado hace -101m").
 *
 * Estas funciones asumen UTC cuando la cadena no dice lo contrario. La
 * corrección de raíz es que la API emita el sufijo de zona; mientras tanto,
 * todo consumo de fechas debería pasar por aquí.
 */

const SIN_ZONA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const normalizado = SIN_ZONA.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Antigüedad en formato corto: 12m, 5h, 3d. */
export function timeAgo(value?: string | null): string {
  const fecha = parseApiDate(value);
  if (!fecha) return '—';

  const ms = Date.now() - fecha.getTime();
  // Un reloj desfasado no debe producir tiempos negativos en pantalla.
  if (ms < 0) return '0m';

  const minutos = Math.floor(ms / 60_000);
  if (minutos < 60) return `${minutos}m`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d`;
}

export function formatApiDate(value?: string | null, opciones?: Intl.DateTimeFormatOptions): string {
  const fecha = parseApiDate(value);
  return fecha ? fecha.toLocaleDateString('es-MX', opciones) : '—';
}

export function formatApiDateTime(value?: string | null): string {
  const fecha = parseApiDate(value);
  return fecha ? fecha.toLocaleString('es-MX') : '—';
}
