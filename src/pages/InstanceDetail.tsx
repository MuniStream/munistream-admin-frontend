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
      return estado === 'paused' || estado === 'running' ? 15_000 : false;
    },
  });

  const hayAccionPendiente = useMemo(() => {
    const p: any = track.data;
    return !!p?.input_form && WAITING_STATES.includes(p?.waiting_for);
  }, [track.data]);

  const tabs = useMemo(() => {
    const items = [
      { value: 'dossier', label: t('instDetail.tabDossier') },
      { value: 'attachments', label: t('instDetail.tabAttachments') },
      { value: 'timeline', label: t('instDetail.tabTimeline') },
    ];
    // La acción del revisor va primero cuando existe: es la herramienta de
    // trabajo, no un detalle más del expediente.
    return hayAccionPendiente
      ? [{ value: 'action', label: t('instDetail.tabAction') }, ...items]
      : items;
  }, [hayAccionPendiente, t]);

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
    <Box>
      <InstanceStickyHeader
        instance={detail.data.instance}
        progress={track.data}
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
        {tabActiva === 'action' && instanceId && (
          <InstanceActionPanel
            instanceId={instanceId}
            progress={track.data}
            onSubmitted={refrescar}
          />
        )}

        {tabActiva === 'dossier' && <InstanceContextPanel context={detail.data.context} />}

        {tabActiva === 'attachments' && instanceId && (
          <InstanceAttachmentsPanel
            instanceId={instanceId}
            attachments={detail.data.attachments}
          />
        )}

        {tabActiva === 'timeline' && <InstanceTimeline progress={track.data} />}
      </Box>

      <EntityDetailDrawer
        instanceId={instanceId}
        entityId={entidadAbierta}
        summary={resumenEntidad}
        onClose={cerrarEntidad}
      />
    </Box>
  );
}
