export interface EnvioReporte {
  destinatario: string;
  enviado: boolean;
  error?: string | null;
  fecha: string;
}

export interface ResumenReporte {
  recibidos: number;
  resueltos: number;
  aprobados: number;
  rechazados: number;
  porcentaje_en_plazo: number | null;
  dias_promedio: number | null;
  en_revision: number;
  semaforo: { verde: number; amarillo: number; rojo: number };
  satisfaccion: number | null;
  opiniones: number;
  solicitudes_atencion: number;
  solicitudes_respondidas: number;
  horas_primera_respuesta: number | null;
}

export interface Reporte {
  reporte_id: string;
  periodo: 'semanal' | 'mensual' | 'a_demanda';
  desde: string;
  hasta: string;
  generado_at: string;
  generado_por: string;
  resumen: ResumenReporte;
  envios: EnvioReporte[];
}

export interface ConfiguracionReportes {
  destinatarios: string[];
  semanal: boolean;
  mensual: boolean;
  alertas: boolean;
}
