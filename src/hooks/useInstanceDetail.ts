/** Consultas del expediente de instancia. */

import { useQuery } from '@tanstack/react-query';
import instanceDetailService from '@/services/instanceDetailService';

/**
 * El expediente y la cartera se piden en paralelo desde el mismo `instanceId`,
 * sin encadenar una con otra: encadenarlas haría que el encabezado apareciera
 * en dos tiempos, y el encabezado es justo lo que debe estar siempre a la vista.
 */
export function useInstanceAdminDetail(instanceId?: string) {
  return useQuery({
    queryKey: ['instance-detail', instanceId],
    queryFn: () => instanceDetailService.getAdminDetail(instanceId!),
    enabled: !!instanceId,
    staleTime: 30_000,
  });
}

export function useCitizenWallet(instanceId?: string, limit = 50) {
  return useQuery({
    queryKey: ['instance-entities', instanceId, { limit }],
    queryFn: () => instanceDetailService.getCitizenEntities(instanceId!, { limit }),
    enabled: !!instanceId,
    staleTime: 30_000,
  });
}

/**
 * Detalle de una entidad. Solo se pide cuando el panel lateral está abierto, y
 * se considera inmutable durante la sesión de revisión: volver a abrir la misma
 * entidad no vuelve a pedirla.
 */
export function useCitizenEntity(instanceId?: string, entityId?: string | null) {
  return useQuery({
    queryKey: ['entity-detail', instanceId, entityId],
    queryFn: () => instanceDetailService.getCitizenEntity(instanceId!, entityId!),
    enabled: !!instanceId && !!entityId,
    staleTime: Infinity,
  });
}
