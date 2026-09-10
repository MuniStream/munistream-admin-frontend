import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import instanceDetailService from '@/services/instanceDetailService';
import { useCitizenWallet, useInstanceAdminDetail } from '@/hooks/useInstanceDetail';
import InstanceStickyHeader from '@/components/instance/InstanceStickyHeader';
import InstanceActionPanel, { WAITING_STATES } from '@/components/instance/InstanceActionPanel';
import InstanceContextPanel from '@/components/instance/InstanceContextPanel';
import InstanceAttachmentsPanel from '@/components/instance/InstanceAttachmentsPanel';
import InstanceTimeline from '@/components/instance/InstanceTimeline';
import EntityDetailDrawer from '@/components/instance/EntityDetailDrawer';
import EntityDocumentView from '@/components/instance/EntityDocumentView';
import PageContainer from '@/components/ui/PageContainer';

/**
 * Expediente del trámite.
 *
 * Reúne en una pantalla lo que un revisor necesita tener delante: quién es el
 * ciudadano y qué entidades tiene, siempre visibles en el encabezado; y el
 * contexto, los adjuntos y la acción pendiente en el cuerpo.
 *
 * ESTRUCTURA: el contenedor exterior no debe recibir `overflow` ni altura fija.
 * El encabezado se mantiene a la vista con `position: sticky` contra el scroll
 * de la ventana, y eso deja de funcionar --sin ningún error-- en cuanto un
 * ancestro crea su propio contexto de desplazamiento.
 */
export default function InstanceDetail() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<string | null>(null);

  const detail = useInstanceAdminDetail(instanceId);
  const wallet = useCitizenWallet(instanceId);

  // El progreso es lo único que cambia solo mientras el trámite está vivo, así
  // que es lo único que se reconsulta; el expediente no se sondea.
  const track = useQuery({
    queryKey: ['instance-track', instanceId],
    queryFn: async () => (await api.get(`/instances/${instanceId}/track`)).data,
    enabled: !!instanceId,
    refetchInterval: (query) => {
      const estado = (query.state.data as any)?.status;
      // `running` es el hueco entre dos pasos: dura segundos y al otro lado
      // aparece el formulario siguiente. Esperar quince segundos a ver si ya
      // está es lo que hace que el paso siguiente tarde en aparecer.
      if (estado === 'running') return 3_000;
      return estado === 'paused' ? 15_000 : false;
    },
  });

  const hayAccionPendiente = useMemo(() => {
    const p: any = track.data;
    return !!p?.input_form && WAITING_STATES.includes(p?.waiting_for);
  }, [track.data]);

  /** Un trámite terminado no admite ninguna acción; uno vivo puede pedirla en cualquier momento. */
  const quedaTrabajo = useMemo(() => {
    const estado = (track.data as any)?.status;
    return !!estado && !['completed', 'failed', 'cancelled'].includes(estado);
  }, [track.data]);

  // Entidades emitidas por el trámite (documento oficial). El backend las
  // resuelve del contexto en /track; la pestaña solo aparece cuando existe al
  // menos una.
  const emittedEntities: Array<{ entity_id: string; entity_type?: string }> =
    (track.data as any)?.emitted_entities ?? [];

  const tabs = useMemo(() => {
    const items = [
      { value: 'dossier', label: t('instDetail.tabDossier') },
      // Solo aparece si hay trámite de origen: en una validación
      // administrativa, lo que se revisa es lo que el ciudadano aportó allí.
      ...(detail.data?.context?.origin
        ? [{ value: 'origin', label: t('instDetail.tabOrigin') }]
        : []),
      // Documento(s) que emitió el trámite: solo cuando ya se emitió alguno.
      ...(emittedEntities.length > 0
        ? [{ value: 'emitted', label: t('instDetail.tabEmitted') }]
        : []),
      { value: 'attachments', label: t('instDetail.tabAttachments') },
      { value: 'timeline', label: t('instDetail.tabTimeline') },
    ];
    // La acción del revisor va primero: es la herramienta de trabajo, no un
    // detalle más del expediente.
    //
    // Está mientras el trámite siga vivo, y no sólo cuando hay un formulario
    // esperando ahora mismo. Entre un paso y el siguiente el trámite pasa unos
    // segundos por `running`, sin formulario: la pestaña desaparecía y volvía a
    // aparecer sola, y a quien estaba trabajando en ella se le movía el sitio
    // bajo los pies justo después de enviar. Sólo se retira cuando el trámite
    // termina, que es cuando de verdad no queda nada que hacer.
    return quedaTrabajo
      ? [{ value: 'action', label: t('instDetail.tabAction') }, ...items]
      : items;
  }, [quedaTrabajo, detail.data, emittedEntities.length, t]);

  // Mientras no se sepa si hay acción pendiente no se elige pestaña: si no,
  // el cuerpo pinta el expediente y salta a Acción un instante después.
  const decidiendoTab = tab === null && track.isLoading;
  const tabActiva = tab ?? (hayAccionPendiente ? 'action' : 'dossier');

  // El panel lateral vive en la URL: así se puede compartir el enlace a una
  // entidad concreta y el botón Atrás del navegador lo cierra.
  const entidadAbierta = searchParams.get('entity');

  const abrirEntidad = (entityId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('entity', entityId);
    setSearchParams(next);
  };

  const cerrarEntidad = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('entity');
    setSearchParams(next, { replace: true });
  };

  const prefetchEntidad = (entityId: string) => {
    if (!instanceId) return;
    queryClient.prefetchQuery({
      queryKey: ['entity-detail', instanceId, entityId],
      queryFn: () => instanceDetailService.getCitizenEntity(instanceId, entityId),
      staleTime: Infinity,
    });
  };

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ['instance-detail', instanceId] });
    queryClient.invalidateQueries({ queryKey: ['instance-entities', instanceId] });
    queryClient.invalidateQueries({ queryKey: ['instance-track', instanceId] });
  };

  if (detail.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{t('instDetail.loadError')}</Alert>
      </Box>
    );
  }

  const entidades = wallet.data?.entities ?? [];
  const resumenEntidad = entidades.find((e) => e.entity_id === entidadAbierta);

  return (
    <PageContainer
      title={detail.data.instance.workflow_name}
      subtitle={detail.data.citizen.full_name ?? undefined}
      disableGutters
      fullWidth
    >
      <InstanceStickyHeader
        instance={detail.data.instance}
        progress={track.data}
        origin={detail.data.origin}
        citizen={detail.data.citizen}
        entities={entidades}
        totalEntities={wallet.data?.total ?? 0}
        walletLoading={wallet.isLoading}
        selectedEntityId={entidadAbierta}
        tab={tabActiva}
        tabs={tabs}
        onTabChange={setTab}
        onOpenEntity={abrirEntidad}
        onPrefetchEntity={prefetchEntidad}
        onBack={() => navigate('/instances')}
        onRefresh={refrescar}
      />

      <Box sx={{ px: { xs: 1.5, sm: 3 }, py: 3 }}>
        {decidiendoTab && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!decidiendoTab && tabActiva === 'action' && instanceId && (
          <InstanceActionPanel
            instanceId={instanceId}
            progress={track.data}
            onSubmitted={refrescar}
          />
        )}

        {!decidiendoTab && tabActiva === 'dossier' && (
          <InstanceContextPanel
            context={detail.data.context}
            instanceId={instanceId}
            attachments={detail.data.attachments}
          />
        )}

        {!decidiendoTab && tabActiva === 'origin' && detail.data.context.origin && (
          // Los archivos del trámite padre viajan dentro de esta instancia, así
          // que se sirven por ella: el revisor puede abrirlos sin salir de la
          // validación, que es justo lo que está revisando.
          <InstanceContextPanel
            context={detail.data.context.origin}
            instanceId={instanceId}
            attachments={detail.data.origin_attachments}
          />
        )}

        {!decidiendoTab && tabActiva === 'emitted' && instanceId && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {emittedEntities.map((e) => (
              <EntityDocumentView
                key={e.entity_id}
                instanceId={instanceId}
                entityId={e.entity_id}
                entityName={e.entity_type || e.entity_id}
                onExpand={() => abrirEntidad(e.entity_id)}
              />
            ))}
          </Box>
        )}

        {!decidiendoTab && tabActiva === 'attachments' && instanceId && (
          <InstanceAttachmentsPanel
            instanceId={instanceId}
            attachments={detail.data.attachments}
          />
        )}

        {!decidiendoTab && tabActiva === 'timeline' && <InstanceTimeline progress={track.data} />}
      </Box>

      <EntityDetailDrawer
        instanceId={instanceId}
        entityId={entidadAbierta}
        summary={resumenEntidad}
        onClose={cerrarEntidad}
      />
    </PageContainer>
  );
}
