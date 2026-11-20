export type ColorSemaforo = 'verde' | 'amarillo' | 'rojo';

export interface PlazoEvaluado {
  fecha_presentacion: string;
  fecha_compromiso: string;
  plazo_dias: number;
  plazo_habiles: boolean;
  dias_transcurridos: number;
  avance: number;
  color: ColorSemaforo;
  pausado: boolean;
  resuelto: boolean;
  en_plazo: boolean | null;
}

export interface ItemSemaforo {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  folio: string | null;
  status: string;
  review_instance_id: string;
  assigned_user_id: string | null;
  assigned_team_id: string | null;
  asignado_a: string | null;
  solicitante: string | null;
  paso_actual: string | null;
  en_espera: boolean;
  permanencia_horas: number | null;
  p95_paso_horas: number | null;
  color_paso: ColorSemaforo | null;
  plazo: PlazoEvaluado | null;
  color: ColorSemaforo | null;
}

export interface RespuestaSemaforo {
  resumen: Record<ColorSemaforo | 'sin_plazo' | 'pausados', number>;
  items: ItemSemaforo[];
  generado: string;
}
