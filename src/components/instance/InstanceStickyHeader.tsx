import { useEffect, useRef, useState } from 'react';
import { Box, Chip, Divider, IconButton, Link, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import CitizenIdentityBlock from './CitizenIdentityBlock';
import EntityWalletStrip from './EntityWalletStrip';
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { DossierInstance, DossierCitizen, DossierOrigin, WalletEntity } from '@/types/instanceDetail';

interface Props {
  instance?: DossierInstance;
  origin?: DossierOrigin | null;
  /** Avance del trámite, del endpoint de seguimiento. */
  progress?: { completed_steps?: number; total_steps?: number; progress_percentage?: number };
  citizen?: DossierCitizen;
  entities: WalletEntity[];
  totalEntities: number;
  walletLoading: boolean;
  selectedEntityId: string | null;
  tab: string;
  tabs: { value: string; label: string }[];
  onTabChange: (value: string) => void;
  onOpenEntity: (entityId: string) => void;
  onPrefetchEntity?: (entityId: string) => void;
  onBack: () => void;
  onRefresh: () => void;
}

const ESTADO_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  completed: 'success',
  failed: 'error',
  cancelled: 'error',
  paused: 'warning',
  awaiting_input: 'warning',
  running: 'info',
};

/**
 * Encabezado del expediente, siempre visible.
 *
 * Mecánica: el layout del admin tiene el `AppBar` en `position: fixed` sobre un
 * `<main>` con margen superior, y el scroll es el de la ventana. Así que basta
 * `position: sticky` con `top` a la altura del Toolbar para que este bloque
 * quede pegado justo debajo de la barra de la aplicación.
 *
 * CUIDADO al modificar la página que lo contiene: si cualquier ancestro recibe
 * `overflow` distinto de `visible` o una altura fija, `sticky` deja de aplicar
 * sin ningún error visible y el encabezado se va con el scroll. No existía
 * ningún otro elemento pegajoso en esta aplicación, así que no hay más
 * precedentes de los que fiarse.
 */
export default function InstanceStickyHeader({
  instance, progress, origin, citizen, entities, totalEntities, walletLoading, selectedEntityId,
  tab, tabs, onTabChange, onOpenEntity, onPrefetchEntity, onBack, onRefresh,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [compact, setCompact] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // El colapso se detecta con un centinela y un IntersectionObserver, no con un
  // listener de scroll: un listener re-renderiza en cada fotograma del scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />

      <Box
        component="header"
        data-testid="instance-header"
        aria-label={t('instDetail.headerLabel')}
        sx={{
          position: 'sticky',
          // Del token que publica el tema: si la barra cambia de alto, esta
          // cabecera lo sigue sola. Antes eran dos valores escritos a mano que
          // había que recordar mantener en sincronía.
          top: { xs: 'var(--ms-appbar-h-xs)', sm: 'var(--ms-appbar-h)' },
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: compact ? 2 : 0,
          px: { xs: 1.5, sm: 3 },
          pt: compact ? 1 : 2,
          pb: 0,
          // Solo se animan opacidad y espaciado. Animar la altura provoca
          // saltos y descoloca el anclaje del propio sticky.
          transition: 'padding 150ms ease, box-shadow 150ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title={t('instDetail.back')}>
            <IconButton size="small" onClick={onBack} aria-label={t('instDetail.back')}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <AssignmentIcon color="action" fontSize={compact ? 'small' : 'medium'} />

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              data-testid="instance-workflow-name"
              variant={compact ? 'subtitle2' : 'h6'}
              noWrap
              sx={{ fontWeight: 600 }}
              title={instance?.workflow_name}
            >
              {instance?.workflow_name}
            </Typography>

            {/* En una validación administrativa lo que identifica el trabajo
                es el trámite del ciudadano, no el nombre del flujo de
                validación: sin esto, dos validaciones de trámites distintos
                tienen exactamente el mismo encabezado. */}
            {origin?.parent_workflow_name && (
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {t('instDetail.validatingTramite')}{' '}
                {origin.parent_instance_id ? (
                  <Link
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={() => navigate(`/instances/${origin.parent_instance_id}`)}
                    sx={{ verticalAlign: 'baseline' }}
                  >
                    {origin.parent_workflow_name}
                  </Link>
                ) : (
                  origin.parent_workflow_name
                )}
              </Typography>
            )}
          </Box>

          {instance && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={instance.status}
                color={ESTADO_COLOR[instance.status] || 'default'}
              />
              {/* El avance va en el encabezado y no en una pestaña: es lo
                  primero que se mira al abrir un expediente, y tenerlo que
                  buscar obligaba a cambiar de sección para saber si el
                  trámite ya terminó. */}
              {progress?.total_steps ? (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {t('wfExec.stepsCompleted', {
                    completed: progress.completed_steps ?? 0,
                    total: progress.total_steps,
                  })}
                  {' · '}
                  {Math.round(progress.progress_percentage ?? 0)}%
                </Typography>
              ) : null}

              <Tooltip title={t('instDetail.refresh')}>
                <IconButton size="small" onClick={onRefresh} aria-label={t('instDetail.refresh')}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {citizen && (
          <Box sx={{ mt: compact ? 0.25 : 1 }}>
            <CitizenIdentityBlock citizen={citizen} compact={compact} />
          </Box>
        )}

        <Box sx={{ mt: compact ? 0.75 : 1.5 }}>
          <EntityWalletStrip
            entities={entities}
            total={totalEntities}
            loading={walletLoading}
            compact={compact}
            selectedEntityId={selectedEntityId}
            onOpen={onOpenEntity}
            onPrefetch={onPrefetchEntity}
          />
        </Box>

        <Divider sx={{ mt: 1 }} />

        {/* Las pestañas viven dentro del bloque pegajoso: así se puede saltar
            entre secciones sin volver al principio de la página. */}
        <Tabs
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0 } }}
        >
          {tabs.map((tb) => (
            <Tab key={tb.value} value={tb.value} label={tb.label} />
          ))}
        </Tabs>
      </Box>
    </>
  );
}
