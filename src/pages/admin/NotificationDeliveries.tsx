import { useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  notificationsService,
  type DeliveryStatus,
  type NotificationChannel,
} from '@/services/notifications';

const STATUS_LABEL: Record<DeliveryStatus, { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  queued: { label: 'En cola', color: 'info' },
  sending: { label: 'Enviando', color: 'info' },
  sent: { label: 'Entregado', color: 'success' },
  failed: { label: 'Fallido', color: 'error' },
  retrying: { label: 'Reintentando', color: 'warning' },
  rate_limited: { label: 'Límite de tasa', color: 'warning' },
  skipped_opt_out: { label: 'Opt-out', color: 'default' },
};

export default function NotificationDeliveries() {
  const [filters, setFilters] = useState<{
    status?: DeliveryStatus | '';
    channel?: NotificationChannel | '';
    instance_id?: string;
  }>({ status: '', channel: '', instance_id: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['notif', 'deliveries', filters],
    queryFn: () =>
      notificationsService.listDeliveries({
        status: filters.status || undefined,
        channel: filters.channel || undefined,
        instance_id: filters.instance_id || undefined,
      }),
    refetchInterval: 10000,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Envíos de notificaciones
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="Estado"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, status: (e.target.value as DeliveryStatus) || '' })
          }
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {(Object.keys(STATUS_LABEL) as DeliveryStatus[]).map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_LABEL[s].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Canal"
          value={filters.channel ?? ''}
          onChange={(e) =>
            setFilters({ ...filters, channel: (e.target.value as NotificationChannel) || '' })
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="email">Correo</MenuItem>
          <MenuItem value="whatsapp">WhatsApp</MenuItem>
        </TextField>
        <TextField
          label="ID de instancia"
          value={filters.instance_id ?? ''}
          onChange={(e) => setFilters({ ...filters, instance_id: e.target.value })}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      {isLoading && <CircularProgress />}
      {!isLoading && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Canal</TableCell>
                <TableCell>Destinatario</TableCell>
                <TableCell>Plantilla</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Intentos</TableCell>
                <TableCell>Error</TableCell>
                <TableCell>Instancia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>Sin envíos registrados.</TableCell>
                </TableRow>
              )}
              {data?.map((d) => {
                const labelCfg = STATUS_LABEL[d.status];
                return (
                  <TableRow key={d.id}>
                    <TableCell>{new Date(d.created_at).toLocaleString()}</TableCell>
                    <TableCell>{d.channel}</TableCell>
                    <TableCell>{d.recipient}</TableCell>
                    <TableCell>{d.template_key}</TableCell>
                    <TableCell>
                      <Chip label={labelCfg.label} color={labelCfg.color} size="small" />
                    </TableCell>
                    <TableCell align="center">{d.attempts}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: 'error.main' }}>
                        {d.last_error || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{d.instance_id || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
