// Performance reports: history (PDF/XLSX download), on-demand generation and
// the settings for the scheduled weekly/monthly reports and the daily
// traffic-light alerts. Backed by /admin/reportes (services/reportes.py).
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as XlsxIcon,
  PlayArrow as GenerarIcon,
  NotificationsActive as AlertaIcon,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import adminService from '@/services/adminService';
import PageContainer from '@/components/ui/PageContainer';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { ESPACIADO } from '@/theme/tokens';
import type { ConfiguracionReportes, Reporte } from '@/types/reportes';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
// The period ends at an exclusive bound (00:00 of the next day): show the last day it covers.
const fechaFin = (iso: string) => fecha(new Date(new Date(iso).getTime() - 1000).toISOString());

async function descargar(reporte: Reporte, formato: 'pdf' | 'xlsx') {
  const { blob, nombre } = await adminService.descargarReporte(reporte, formato);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function Configuracion() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['reportes-config'], queryFn: adminService.getConfiguracionReportes });
  const [cfg, setCfg] = useState<ConfiguracionReportes | null>(null);
  const [nuevo, setNuevo] = useState('');
  useEffect(() => { if (data) setCfg(data); }, [data]);

  const guardar = useMutation({
    mutationFn: (c: ConfiguracionReportes) => adminService.guardarConfiguracionReportes(c),
    onSuccess: (c) => { setCfg(c); qc.setQueryData(['reportes-config'], c); },
  });
  const alertas = useMutation({ mutationFn: adminService.evaluarAlertas });

  if (!cfg) return null;
  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(nuevo.trim());
  const agregar = () => {
    if (!valido) return;
    setCfg({ ...cfg, destinatarios: [...new Set([...cfg.destinatarios, nuevo.trim().toLowerCase()])] });
    setNuevo('');
  };

  return (
    <Paper sx={{ p: ESPACIADO.lg, mb: ESPACIADO.lg }}>
      <Typography variant="h6" gutterBottom>{t('reportes.config.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('reportes.config.help')}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {cfg.destinatarios.length === 0 && (
          <Typography variant="body2" color="text.secondary">{t('reportes.config.sinDestinatarios')}</Typography>
        )}
        {cfg.destinatarios.map((d) => (
          <Chip key={d} label={d} onDelete={() => setCfg({ ...cfg, destinatarios: cfg.destinatarios.filter((x) => x !== d) })} />
        ))}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          type="email"
          label={t('reportes.config.agregar')}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          sx={{ minWidth: 300 }}
        />
        <Button onClick={agregar} disabled={!valido}>{t('reportes.config.agregarBoton')}</Button>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControlLabel control={<Switch checked={cfg.semanal} onChange={(e) => setCfg({ ...cfg, semanal: e.target.checked })} />} label={t('reportes.config.semanal')} />
        <FormControlLabel control={<Switch checked={cfg.mensual} onChange={(e) => setCfg({ ...cfg, mensual: e.target.checked })} />} label={t('reportes.config.mensual')} />
        <FormControlLabel control={<Switch checked={cfg.alertas} onChange={(e) => setCfg({ ...cfg, alertas: e.target.checked })} />} label={t('reportes.config.alertas')} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" onClick={() => guardar.mutate(cfg)} disabled={guardar.isPending}>{t('reportes.config.guardar')}</Button>
        <Button startIcon={<AlertaIcon />} onClick={() => alertas.mutate()} disabled={alertas.isPending}>
          {t('reportes.config.evaluarAlertas')}
        </Button>
        {guardar.isSuccess && <Typography variant="caption" color="text.secondary">{t('reportes.config.guardado')}</Typography>}
        {alertas.data && (
          <Typography variant="caption" color="text.secondary">
            {t('reportes.config.alertasResultado', { n: alertas.data.nuevas })}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function ReportesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [periodo, setPeriodo] = useState<'semanal' | 'mensual' | 'a_demanda'>('semanal');
  const [enviar, setEnviar] = useState(false);
  const { data: reportes, isLoading } = useQuery({ queryKey: ['reportes'], queryFn: adminService.getReportes });

  const generar = useMutation({
    mutationFn: () => adminService.generarReporte({ periodo, enviar }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reportes'] }),
  });

  return (
    <PageContainer title={t('reportes.title')} subtitle={t('reportes.subtitle')} surface={false}>
      <Configuracion />

      <Paper sx={{ p: ESPACIADO.lg, mb: ESPACIADO.lg }}>
        <Typography variant="h6" gutterBottom>{t('reportes.generar.title')}</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <Select size="small" value={periodo} onChange={(e) => setPeriodo(e.target.value as typeof periodo)} sx={{ minWidth: 260 }}>
            <MenuItem value="semanal">{t('reportes.periodo.semanal')}</MenuItem>
            <MenuItem value="mensual">{t('reportes.periodo.mensual')}</MenuItem>
            <MenuItem value="a_demanda">{t('reportes.periodo.a_demanda')}</MenuItem>
          </Select>
          <FormControlLabel control={<Switch checked={enviar} onChange={(e) => setEnviar(e.target.checked)} />} label={t('reportes.generar.enviar')} />
          <Button variant="contained" startIcon={<GenerarIcon />} onClick={() => generar.mutate()} disabled={generar.isPending}>
            {t('reportes.generar.boton')}
          </Button>
        </Stack>
        {generar.isError && <Alert severity="error" sx={{ mt: 2 }}>{t('reportes.generar.error')}</Alert>}
      </Paper>

      <Paper>
        <Box sx={{ p: ESPACIADO.lg, pb: 0 }}>
          <Typography variant="h6">{t('reportes.historial')}</Typography>
        </Box>
        {isLoading ? (
          <LoadingState />
        ) : !reportes || reportes.length === 0 ? (
          <EmptyState title={t('reportes.vacio')} description={t('reportes.vacioDescripcion')} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reportes.col.periodo')}</TableCell>
                  <TableCell>{t('reportes.col.cubre')}</TableCell>
                  <TableCell align="right">{t('reportes.col.recibidos')}</TableCell>
                  <TableCell align="right">{t('reportes.col.resueltos')}</TableCell>
                  <TableCell align="right">{t('reportes.col.enPlazo')}</TableCell>
                  <TableCell>{t('reportes.col.generado')}</TableCell>
                  <TableCell>{t('reportes.col.envio')}</TableCell>
                  <TableCell align="right">{t('reportes.col.archivos')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportes.map((r: Reporte) => {
                  const ok = r.envios.filter((e) => e.enviado).length;
                  return (
                    <TableRow key={r.reporte_id} hover>
                      <TableCell>{t(`reportes.periodo.${r.periodo}`)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fecha(r.desde)} – {fechaFin(r.hasta)}</TableCell>
                      <TableCell align="right">{r.resumen.recibidos}</TableCell>
                      <TableCell align="right">{r.resumen.resueltos}</TableCell>
                      <TableCell align="right">{r.resumen.porcentaje_en_plazo == null ? '—' : `${r.resumen.porcentaje_en_plazo} %`}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{fecha(r.generado_at)}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.generado_por === 'sistema' ? t('reportes.automatico') : r.generado_por}</Typography>
                      </TableCell>
                      <TableCell>
                        {r.envios.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">{t('reportes.noEnviado')}</Typography>
                        ) : (
                          <Tooltip title={r.envios.map((e) => `${e.destinatario}: ${e.enviado ? 'OK' : e.error}`).join('\n')}>
                            <Chip size="small" color={ok === r.envios.length ? 'success' : 'warning'} label={t('reportes.enviados', { ok, total: r.envios.length })} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Button size="small" startIcon={<PdfIcon />} onClick={() => descargar(r, 'pdf')}>PDF</Button>
                        <Button size="small" startIcon={<XlsxIcon />} onClick={() => descargar(r, 'xlsx')}>Excel</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <Grid container sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">{t('reportes.programacion')}</Typography>
      </Grid>
    </PageContainer>
  );
}
