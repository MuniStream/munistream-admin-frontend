/**
 * Capa de red del expediente de instancia.
 *
 * Usa la instancia de axios compartida, que ya lleva el interceptor de token de
 * Keycloak y el refresco en 401. Nada de `fetch` con el token sacado a mano de
 * `sessionStorage`: ese atajo se salta el refresco y deja al revisor con 401 a
 * mitad de una revisión.
 */

import api from './api';
import type {
  EntityDetail,
  InstanceAdminDetail,
  WalletPage,
} from '@/types/instanceDetail';

export const instanceDetailService = {
  /** Identidad del ciudadano, contexto curado y adjuntos, en una sola llamada. */
  async getAdminDetail(instanceId: string): Promise<InstanceAdminDetail> {
    const { data } = await api.get(`/instances/${instanceId}/admin-detail`);
    return data;
  },

  /** Cartera del ciudadano dueño del trámite. */
  async getCitizenEntities(
    instanceId: string,
    params: { skip?: number; limit?: number; entity_type?: string } = {},
  ): Promise<WalletPage> {
    const { data } = await api.get(`/instances/${instanceId}/citizen-entities`, { params });
    return data;
  },

  /** Detalle de una entidad de la cartera, bajo demanda. */
  async getCitizenEntity(instanceId: string, entityId: string): Promise<EntityDetail> {
    const { data } = await api.get(`/instances/${instanceId}/entities/${entityId}`);
    return data;
  },

  /**
   * Documento renderizado de una entidad: la misma representación que ve el
   * ciudadano (acuse, credencial, certificado), con el visualizador que la
   * propia entidad declara.
   *
   * Se devuelve como texto para pintarlo con `srcDoc` en un iframe, en vez de
   * apuntar el iframe al endpoint: así la petición lleva el token de sesión,
   * que un `src` no puede llevar.
   */
  async getEntityDocumentHtml(instanceId: string, entityId: string): Promise<string> {
    const { data } = await api.get(
      `/instances/${instanceId}/entities/${entityId}/document`,
      { params: { format: 'html' }, responseType: 'text' },
    );
    return data;
  },

  /** El mismo documento en PDF, para descargar. */
  async fetchEntityDocumentPdf(instanceId: string, entityId: string): Promise<Blob> {
    const { data } = await api.get(
      `/instances/${instanceId}/entities/${entityId}/document`,
      { params: { format: 'pdf' }, responseType: 'blob' },
    );
    return data;
  },

  /**
   * Descarga un adjunto como Blob.
   *
   * Va por axios y no por un `<a href>` porque el endpoint exige el token de
   * sesión y un ancla no puede mandar la cabecera `Authorization`. Quien use
   * esto debe revocar el object URL al desmontar.
   */
  async fetchAttachment(instanceId: string, attachmentId: string): Promise<Blob> {
    const { data } = await api.get(
      `/instances/${instanceId}/attachments/${attachmentId}/content`,
      { responseType: 'blob' },
    );
    return data;
  },
};

export default instanceDetailService;
