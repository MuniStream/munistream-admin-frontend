import { createContext, useContext } from 'react';
import type { DossierAttachment } from '@/types/instanceDetail';

/**
 * Lo que un visualizador necesita del trámite, más allá de sus propios campos.
 *
 * Un paso de subida guarda claves de S3, no archivos, y un paso de elección de
 * entidades guarda identificadores: para enseñar el documento hay que ir a
 * buscarlo, y para eso hace falta saber de qué instancia se está hablando. Va por
 * contexto de React y no como prop porque lo consumen dos visualizadores de los
 * nueve, y encadenarlo por toda la firma para eso ensucia a los otros siete.
 */
export interface RecursosDelTramite {
  instanceId: string;
  /** Adjuntos ya normalizados por el backend, con su `task_id`. */
  attachments: DossierAttachment[];
  /** Abre el adjunto a tamaño completo. */
  previsualizar: (attachment: DossierAttachment) => void;
}

const Contexto = createContext<RecursosDelTramite | null>(null);

export const RecursosProvider = Contexto.Provider;

/** `null` en el expediente de origen, que es de otra instancia y no se puede servir desde esta. */
export function useRecursos(): RecursosDelTramite | null {
  return useContext(Contexto);
}

/** Una referencia a un archivo guardado: lo que el portal deja en el campo al subirlo. */
export interface ReferenciaS3 {
  filename?: string;
  content_type?: string;
  size?: number;
  s3_key?: string;
  s3_bucket?: string;
  bucket?: string;
}

export function esReferenciaS3(valor: unknown): valor is ReferenciaS3 {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
  const o = valor as Record<string, unknown>;
  return typeof o.s3_key === 'string' && o.s3_key.length > 0;
}

/**
 * El adjunto que corresponde a una referencia de campo.
 *
 * No basta con comparar la clave de almacenamiento. Cuando el ciudadano sube un
 * archivo queda bajo `tmp/`, y el operador de S3 lo copia despues a su sitio
 * definitivo: son dos claves para el mismo documento, y el expediente se queda
 * con la copia definitiva, que es la unica que se puede servir. Por eso, si la
 * clave no coincide, se busca por nombre y tamano, que es lo que sobrevive a la
 * copia.
 */
export function buscarAdjunto(
  attachments: DossierAttachment[],
  ref: ReferenciaS3,
): DossierAttachment | null {
  if (ref.s3_key) {
    const exacta = attachments.find((a) => a.s3_key === ref.s3_key);
    if (exacta) return exacta;
  }
  if (ref.filename) {
    const porNombreYTamano = attachments.find(
      (a) => a.filename === ref.filename && (ref.size === undefined || a.size === ref.size),
    );
    if (porNombreYTamano) return porNombreYTamano;
    return attachments.find((a) => a.filename === ref.filename) ?? null;
  }
  return null;
}
