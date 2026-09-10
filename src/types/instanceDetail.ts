/** Tipos del expediente de una instancia en la vista de administración. */

/** De dónde salió la identidad del ciudadano.
 *
 * `instance.user_id` es ambiguo por historia: guarda el id de `Customer` para
 * los trámites del portal y el `sub` de Keycloak para los creados desde la API
 * de administración. El backend resuelve en cascada y devuelve la fuente para
 * que la interfaz pueda avisar cuando el dato es inferido y no leído del
 * registro del ciudadano.
 */
export type CitizenSource =
  | 'customer'
  | 'context'
  | 'parent'
  | 'parent_context'
  | 'unknown';

export interface DossierCitizen {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  curp: string | null;
  rfc: string | null;
  source: CitizenSource;
}

export interface DossierAssignment {
  assigned_user_id: string | null;
  assigned_team_id: string | null;
  assignment_status: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  assignment_notes: string | null;
}

export interface DossierInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  current_step: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  assignment: DossierAssignment;
}

/** Origen del adjunto dentro del contexto del trámite. */
export type AttachmentOrigin =
  | 'citizen_upload'
  | 'operator_output'
  | 'legacy'
  | 'legacy_inline'
  | 'context';

export interface DossierAttachment {
  attachment_id: string;
  task_id: string;
  field: string;
  filename: string;
  content_type: string | null;
  size: number | null;
  s3_bucket: string | null;
  s3_key: string | null;
  origin: AttachmentOrigin;
  uploaded_at: string | null;
  available: boolean;
}

/** Contexto curado: agrupado por paso, con secretos redactados. */
export interface DossierContext {
  by_task: Record<string, Record<string, unknown>>;
  general: Record<string, unknown>;
  /** Qué operador produjo la salida de cada paso, para saber cómo presentarla. */
  operators?: Record<string, { operator: string; name?: string | null; group?: string | null }>;
  /**
   * El contexto del trámite del que nace esta instancia, cuando es una
   * validación de otro. Es lo que de verdad se está validando.
   */
  origin?: {
    by_task: Record<string, Record<string, unknown>>;
    general: Record<string, unknown>;
    operators?: Record<string, { operator: string; name?: string | null; group?: string | null }>;
  } | null;
}

/** Trámite del que nace esta instancia, cuando es una validación de otro. */
export interface DossierOrigin {
  parent_instance_id: string | null;
  parent_workflow_id: string | null;
  parent_workflow_name: string | null;
  parent_task_id: string | null;
}

export interface InstanceAdminDetail {
  instance: DossierInstance;
  citizen: DossierCitizen;
  origin: DossierOrigin | null;
  context: DossierContext;
  attachments: DossierAttachment[];
  /** Los del trámite del que nace esta instancia; vacío si no es una validación. */
  origin_attachments: DossierAttachment[];
  counts: { attachments: number };
}

export interface WalletEntity {
  entity_id: string;
  entity_type: string;
  entity_type_label: string;
  entity_type_icon: string | null;
  entity_type_color: string | null;
  name: string;
  status: string;
  verified: boolean;
  data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  relationships_count: number;
  in_use_by_this_instance: boolean;
}

export interface WalletPage {
  entities: WalletEntity[];
  total: number;
  skip: number;
  limit: number;
}

/** Marcador que el backend deja en lugar de un valor pesado. */
export interface BlobDescriptor {
  __blob: true;
  size: number;
  preview: string | null;
}

export interface EntityDetail {
  entity_id: string;
  entity_type: string;
  entity_type_label: string;
  entity_type_icon: string | null;
  entity_type_color: string | null;
  name: string;
  status: string;
  verified: boolean;
  verification_date: string | null;
  data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  relationships_count: number;
}

export function isBlobDescriptor(value: unknown): value is BlobDescriptor {
  return typeof value === 'object' && value !== null && (value as BlobDescriptor).__blob === true;
}

export function isRedacted(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as any).__redacted === true;
}

export function isTruncated(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as any).__truncated === true;
}
