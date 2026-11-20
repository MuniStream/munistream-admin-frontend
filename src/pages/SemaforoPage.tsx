// Hybrid traffic light: every open citizen procedure judged on two axes, the
// legal resolution term and the dwell time in its current step. The worst
// axis gives the colour. Computed by GET /admin/semaforo (services/sla.py).
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Error as RojoIcon,
  Warning as AmarilloIcon,
  CheckCircle as VerdeIcon,
  PauseCircle as PausaIcon,
  OpenInNew as AbrirIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import adminService from '@/services/adminService';
import PageContainer from '@/components/ui/PageContainer';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { ESTADO, ESPACIADO } from '@/theme/tokens';
import type { ColorSemaforo, ItemSemaforo } from '@/types/semaforo';

const TONO: Record<ColorSemaforo, keyof typeof ESTADO> = {
  verde: 'success',
  amarillo: 'warning',
  rojo: 'error',
};

const ICONO: Record<ColorSemaforo, typeof VerdeIcon> = {
  verde: VerdeIcon,
  amarillo: AmarilloIcon,
  rojo: RojoIcon,
};

const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const horas = (h: number | null) => {
  if (h == null) return '—';
  if (h < 24) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} d`;
};

const paso = (id: string | null) => (id ? id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '');

function Luz({ color, label }: { color: ColorSemaforo | null; label: string }) {
  if (!color) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const Icono = ICONO[color];
  const tono = ESTADO[TONO[color]];
  // Icon + text: the state must not depend on colour alone (WCAG 1.4.1).
  return (
    <Chip
      size="small"
      icon={<Icono sx={{ color: `${tono.main} !important` }} />}
      label={label}
      sx={{ bgcolor: tono.soft, color: tono.onSoft, fontWeight: 600 }}
    />
  );
}

export default function SemaforoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [color, setColor] = useState<ColorSemaforo | ''>('');
  const [workflow, setWorkflow] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['semaforo'],
    queryFn: () => adminService.getSemaforo(),
    refetchInterval: 60_000,
  });

  const tramites = useMemo(() => {
    const m = new Map<string, string>();
    (data?.items ?? []).forEach((i) => m.set(i.workflow_id, i.workflow_name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [data]);

  const visibles = useMemo(
    () =>
      (data?.items ?? []).filter(
        (i) => (!color || i.color === color) && (!workflow || i.workflow_id === workflow),
      ),
    [data, color, workflow],
  );

  const etiqueta = (c: ColorSemaforo | null) => (c ? t(`sem.color.${c}`) : '');
  const r = data?.resumen;

  return (
    <PageContainer
      title={t('sem.title')}
      subtitle={t('sem.subtitle')}
      fullWidth
      surface={false}
      actions={
        <Button startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>
          {t('sem.refresh')}
        </Button>
      }
    >
      <Grid container spacing={ESPACIADO.md} sx={{ mb: ESPACIADO.lg }}>
        {(['rojo', 'amarillo', 'verde'] as ColorSemaforo[]).map((c) => {
          const Icono = ICONO[c];
          return (
            <Grid key={c} size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                role="button"
                tabIndex={0}
                aria-pressed={color === c}
                onClick={() => setColor(color === c ? '' : c)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setColor(color === c ? '' : c)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  outline: color === c ? `2px solid ${ESTADO[TONO[c]].main}` : 'none',
                }}
              >
                <StatCard
                  label={t(`sem.card.${c}`)}
                  sublabel={t(`sem.card.${c}.help`)}
                  value={r?.[c] ?? 0}
                  tone={TONO[c]}
                  icon={<Icono />}
                  loading={isLoading}
                />
              </Box>
            </Grid>
          );
        })}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={t('sem.card.pausados')}
            sublabel={t('sem.card.pausados.help')}
            value={r?.pausados ?? 0}
            tone="neutral"
            icon={<PausaIcon />}
            loading={isLoading}
          />
        </Grid>
      </Grid>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={ESPACIADO.md}
          sx={{ p: ESPACIADO.md, alignItems: { md: 'center' } }}
        >
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel id="sem-tramite">{t('sem.filter.tramite')}</InputLabel>
            <Select
              labelId="sem-tramite"
              label={t('sem.filter.tramite')}
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
            >
              <MenuItem value="">{t('sem.filter.all')}</MenuItem>
              {tramites.map(([id, nombre]) => (
                <MenuItem key={id} value={id}>{nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {(color || workflow) && (
            <Button onClick={() => { setColor(''); setWorkflow(''); }}>{t('sem.filter.clear')}</Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 560 }}>
            {t('sem.legend')}
          </Typography>
        </Stack>

        {isLoading ? (
          <LoadingState />
        ) : visibles.length === 0 ? (
          <EmptyState
            title={t('sem.empty.title')}
            description={t('sem.empty.description')}
            variant={color || workflow ? 'filtered' : 'empty'}
            onClearFilters={() => { setColor(''); setWorkflow(''); }}
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('sem.col.estado')}</TableCell>
                  <TableCell>{t('sem.col.tramite')}</TableCell>
                  <TableCell>{t('sem.col.solicitante')}</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>{t('sem.col.plazo')}</TableCell>
                  <TableCell>{t('sem.col.paso')}</TableCell>
                  <TableCell>{t('sem.col.asignado')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibles.map((i: ItemSemaforo) => (
                  <TableRow key={i.instance_id} hover>
                    <TableCell>
                      <Luz color={i.color} label={etiqueta(i.color)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{i.workflow_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {i.folio ?? i.instance_id.slice(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{i.solicitante ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      {i.plazo ? (
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {t('sem.plazo.dias', {
                                n: i.plazo.dias_transcurridos,
                                total: i.plazo.plazo_dias,
                                tipo: i.plazo.plazo_habiles ? t('sem.plazo.habiles') : t('sem.plazo.naturales'),
                              })}
                            </Typography>
                            {i.plazo.pausado && (
                              <Chip size="small" icon={<PausaIcon />} label={t('sem.plazo.pausado')} />
                            )}
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, i.plazo.avance * 100)}
                            aria-label={t('sem.col.plazo')}
                            sx={{
                              my: 0.5,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { bgcolor: ESTADO[TONO[i.plazo.color]].main },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {t('sem.plazo.compromiso', { fecha: fecha(i.plazo.fecha_compromiso) })}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">{t('sem.plazo.sin')}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {i.en_espera ? t('sem.paso.espera') : paso(i.paso_actual)}
                      </Typography>
                      <Tooltip title={i.p95_paso_horas ? t('sem.paso.p95', { p95: horas(i.p95_paso_horas) }) : ''}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {t('sem.paso.permanencia', { h: horas(i.permanencia_horas) })}
                          </Typography>
                          {i.color_paso && i.color_paso !== 'verde' && (
                            <Luz color={i.color_paso} label={t(i.color_paso === 'rojo' ? 'sem.paso.detenido' : 'sem.paso.lento')} />
                          )}
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{i.asignado_a ?? t('sem.sinAsignar')}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        endIcon={<AbrirIcon />}
                        onClick={() => navigate(`/instances/${i.review_instance_id}`)}
                      >
                        {t('sem.abrir')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </PageContainer>
  );
}
