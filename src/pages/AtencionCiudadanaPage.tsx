// Citizen support inbox: requests opened by applicants from the citizen
// portal, with the conversation, the reply box and the status controls.
// Replying notifies the applicant (email / WhatsApp) through the notifier.
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  MarkEmailUnread as AbiertaIcon,
  MarkEmailRead as RespondidaIcon,
  Archive as CerradaIcon,
  Schedule as TiempoIcon,
  OpenInNew as AbrirIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import adminService from '@/services/adminService';
import PageContainer from '@/components/ui/PageContainer';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { ESPACIADO, ESTADO } from '@/theme/tokens';
import type { EstadoAtencion, SolicitudAtencion } from '@/types/atencion';

const TONO: Record<EstadoAtencion, 'warning' | 'success' | 'neutral'> = {
  abierta: 'warning',
  respondida: 'success',
  cerrada: 'neutral',
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function EstadoChip({ estado }: { estado: EstadoAtencion }) {
  const { t } = useTranslation();
  const tono = ESTADO[TONO[estado]];
  return <Chip size="small" label={t(`atencion.chip.${estado}`)} sx={{ bgcolor: tono.soft, color: tono.onSoft, fontWeight: 600 }} />;
}

function Detalle({ solicitud }: { solicitud: SolicitudAtencion }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');

  const refrescar = () => qc.invalidateQueries({ queryKey: ['atencion'] });
  const responder = useMutation({
    mutationFn: () => adminService.responderAtencion(solicitud.solicitud_id, texto.trim()),
    onSuccess: () => { setTexto(''); refrescar(); },
  });
  const cambiar = useMutation({
    mutationFn: (estado: EstadoAtencion) => adminService.actualizarAtencion(solicitud.solicitud_id, { estado }),
    onSuccess: refrescar,
  });

  return (
    <Box sx={{ p: ESPACIADO.md }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">{solicitud.asunto}</Typography>
          <Typography variant="caption" color="text.secondary">
            {solicitud.folio} · {t(`atencion.categoria.${solicitud.categoria}`)} · {solicitud.solicitante ?? '—'}
          </Typography>
        </Box>
        <Select
          size="small"
          value={solicitud.estado}
          onChange={(e) => cambiar.mutate(e.target.value as EstadoAtencion)}
          aria-label={t('atencion.cambiarEstado')}
        >
          {(['abierta', 'respondida', 'cerrada'] as EstadoAtencion[]).map((e) => (
            <MenuItem key={e} value={e}>{t(`atencion.chip.${e}`)}</MenuItem>
          ))}
        </Select>
      </Stack>
      {solicitud.instance_id && (
        <Button size="small" endIcon={<AbrirIcon />} sx={{ mt: 1 }} onClick={() => navigate(`/instances/${solicitud.instance_id}`)}>
          {t('atencion.verTramite')}
        </Button>
      )}

      <Divider sx={{ my: ESPACIADO.md }} />

      <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {solicitud.mensajes.map((m, i) => {
          const personal = m.autor === 'personal';
          return (
            <Box
              component="li"
              key={i}
              sx={{
                alignSelf: personal ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                bgcolor: personal ? ESTADO.info.soft : 'background.default',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary" component="p">
                {personal ? (m.autor_nombre || t('atencion.personal')) : (solicitud.solicitante || t('atencion.ciudadano'))} · {fechaHora(m.fecha)}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.texto}</Typography>
            </Box>
          );
        })}
      </Stack>

      {solicitud.estado !== 'cerrada' ? (
        <Box sx={{ mt: ESPACIADO.md }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={t('atencion.respuesta')}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            inputProps={{ maxLength: 4000 }}
          />
          {responder.isError && <Alert severity="error" sx={{ mt: 1 }}>{t('atencion.errorResponder')}</Alert>}
          <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
            <Button variant="contained" disabled={!texto.trim() || responder.isPending} onClick={() => responder.mutate()}>
              {t('atencion.enviarRespuesta')}
            </Button>
            <Typography variant="caption" color="text.secondary">{t('atencion.seNotifica')}</Typography>
          </Stack>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: ESPACIADO.md }}>{t('atencion.cerradaAviso')}</Alert>
      )}
    </Box>
  );
}

export default function AtencionCiudadanaPage() {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<EstadoAtencion | 'todas'>('abierta');
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['atencion', estado],
    queryFn: () => adminService.getBandejaAtencion(estado === 'todas' ? undefined : { estado }),
    refetchInterval: 60_000,
  });

  const actual = useMemo(
    () => data?.solicitudes.find((s) => s.solicitud_id === seleccion) ?? data?.solicitudes[0] ?? null,
    [data, seleccion],
  );
  const c = data?.conteo;

  return (
    <PageContainer title={t('atencion.title')} subtitle={t('atencion.subtitle')} fullWidth surface={false}>
      <Grid container spacing={ESPACIADO.md} sx={{ mb: ESPACIADO.lg }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('atencion.estado.abierta')} value={c?.abierta ?? 0} tone="warning" icon={<AbiertaIcon />} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('atencion.estado.respondida')} value={c?.respondida ?? 0} tone="success" icon={<RespondidaIcon />} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label={t('atencion.estado.cerrada')} value={c?.cerrada ?? 0} tone="neutral" icon={<CerradaIcon />} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('atencion.primeraRespuesta')}
            value={data?.horas_promedio_primera_respuesta == null ? '—' : `${data.horas_promedio_primera_respuesta} h`}
            icon={<TiempoIcon />}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Tabs value={estado} onChange={(_, v) => { setEstado(v); setSeleccion(null); }} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          {(['abierta', 'respondida', 'cerrada', 'todas'] as const).map((e) => (
            <Tab key={e} value={e} label={t(`atencion.tab.${e}`)} />
          ))}
        </Tabs>
        {isLoading ? (
          <LoadingState />
        ) : !data || data.solicitudes.length === 0 ? (
          <EmptyState title={t('atencion.vacia')} description={t('atencion.vaciaDescripcion')} />
        ) : (
          <Grid container>
            <Grid size={{ xs: 12, md: 5 }} sx={{ borderRight: { md: '1px solid' }, borderRightColor: { md: 'divider' } }}>
              <List disablePadding>
                {data.solicitudes.map((s) => (
                  <ListItemButton
                    key={s.solicitud_id}
                    selected={actual?.solicitud_id === s.solicitud_id}
                    onClick={() => setSeleccion(s.solicitud_id)}
                    divider
                  >
                    <ListItemText
                      primary={s.asunto}
                      primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
                      secondary={`${s.folio} · ${s.solicitante ?? '—'} · ${fechaHora(s.updated_at)}`}
                    />
                    <EstadoChip estado={s.estado} />
                  </ListItemButton>
                ))}
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>{actual && <Detalle key={actual.solicitud_id} solicitud={actual} />}</Grid>
          </Grid>
        )}
      </Box>
    </PageContainer>
  );
}
