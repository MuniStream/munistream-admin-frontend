import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import QrCode2 from '@mui/icons-material/QrCode2';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsService,
  type BaileysStatus,
  type ChannelConfig,
  type ChannelConfigInput,
  type NotificationChannel,
} from '@/services/notifications';

const CHANNEL_KEY = (channel: NotificationChannel) => ['notif', 'channel', channel];

function useChannel(channel: NotificationChannel) {
  return useQuery({
    queryKey: CHANNEL_KEY(channel),
    queryFn: async () => {
      try {
        return await notificationsService.getChannel(channel);
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

function EmailTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useChannel('email');
  const [form, setForm] = useState(() => ({
    enabled: false,
    host: '',
    port: '587',
    username: '',
    password: '',
    use_tls: 'false',
    start_tls: 'true',
    from_address: '',
    test_recipient: '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Hydrate when config loads
  useQueryHydration(data, (cfg) => {
    setForm({
      enabled: cfg.enabled,
      host: String(cfg.credentials.host ?? ''),
      port: String(cfg.credentials.port ?? '587'),
      username: String(cfg.credentials.username ?? ''),
      password: cfg.credentials.password ? '****' : '',
      use_tls: String(cfg.credentials.use_tls ?? 'false'),
      start_tls: String(cfg.credentials.start_tls ?? 'true'),
      from_address: cfg.from_address ?? '',
      test_recipient: cfg.test_recipient ?? '',
    });
  });

  const save = useMutation({
    mutationFn: (payload: ChannelConfigInput) => notificationsService.saveChannel('email', payload),
    onSuccess: (cfg) => {
      queryClient.setQueryData(CHANNEL_KEY('email'), cfg);
      setStatusMessage({ ok: true, text: 'Configuración guardada.' });
    },
    onError: (err: any) =>
      setStatusMessage({ ok: false, text: err?.response?.data?.detail || 'Error al guardar.' }),
  });

  const test = useMutation({
    mutationFn: () => notificationsService.testChannel('email', {}),
    onSuccess: () => setStatusMessage({ ok: true, text: 'Mensaje de prueba enviado al destinatario configurado.' }),
    onError: (err: any) =>
      setStatusMessage({ ok: false, text: err?.response?.data?.detail || 'No se pudo enviar la prueba.' }),
  });

  const onSave = () => {
    save.mutate({
      enabled: form.enabled,
      credentials: {
        host: form.host,
        port: Number(form.port) || 587,
        username: form.username,
        password: form.password,
        use_tls: form.use_tls === 'true',
        start_tls: form.start_tls === 'true',
      },
      from_address: form.from_address,
      test_recipient: form.test_recipient,
    });
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Correo (SMTP)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configura un servidor SMTP para enviar notificaciones por correo a los ciudadanos.
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Host"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              label="Puerto"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              select
              SelectProps={{ native: true }}
              label="Cifrado"
              value={form.use_tls === 'true' ? 'tls' : form.start_tls === 'true' ? 'starttls' : 'plain'}
              onChange={(e) => {
                const v = e.target.value;
                setForm({
                  ...form,
                  use_tls: v === 'tls' ? 'true' : 'false',
                  start_tls: v === 'starttls' ? 'true' : 'false',
                });
              }}
              fullWidth
            >
              <option value="plain">Sin cifrado</option>
              <option value="starttls">STARTTLS (587)</option>
              <option value="tls">TLS directo (465)</option>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Usuario"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              helperText={form.password === '****' ? 'Deja **** para conservar el valor actual.' : ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Dirección remitente (From)"
              value={form.from_address}
              onChange={(e) => setForm({ ...form, from_address: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Destinatario de prueba"
              value={form.test_recipient}
              onChange={(e) => setForm({ ...form, test_recipient: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                select
                SelectProps={{ native: true }}
                label="Estado"
                value={form.enabled ? 'on' : 'off'}
                onChange={(e) => setForm({ ...form, enabled: e.target.value === 'on' })}
                sx={{ width: 180 }}
              >
                <option value="off">Deshabilitado</option>
                <option value="on">Habilitado</option>
              </TextField>
              <Button variant="contained" onClick={onSave} disabled={save.isPending}>
                Guardar
              </Button>
              <Button
                variant="outlined"
                onClick={() => test.mutate()}
                disabled={test.isPending || !form.test_recipient}
              >
                Enviar correo de prueba
              </Button>
            </Stack>
          </Grid>
          {statusMessage && (
            <Grid item xs={12}>
              <Alert severity={statusMessage.ok ? 'success' : 'error'} onClose={() => setStatusMessage(null)}>
                {statusMessage.text}
              </Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

function WhatsAppTab() {
  const queryClient = useQueryClient();
  const { data: config, isLoading: loadingConfig } = useChannel('whatsapp');
  const [testRecipient, setTestRecipient] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useQueryHydration(config, (cfg) => {
    setTestRecipient(cfg.test_recipient ?? '');
  });

  const { data: status } = useQuery<BaileysStatus>({
    queryKey: ['notif', 'baileys', 'status'],
    queryFn: () => notificationsService.baileysStatus(),
    refetchInterval: 2000,
  });
  const { data: qr } = useQuery({
    queryKey: ['notif', 'baileys', 'qr'],
    queryFn: async () => {
      try {
        return await notificationsService.baileysQr();
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: status?.status === 'waiting_qr' || status?.status === 'connecting',
    refetchInterval: 2000,
  });

  const saveConfig = useMutation({
    mutationFn: (payload: ChannelConfigInput) =>
      notificationsService.saveChannel('whatsapp', payload),
    onSuccess: (cfg) => {
      queryClient.setQueryData(CHANNEL_KEY('whatsapp'), cfg);
      setStatusMessage({ ok: true, text: 'Configuración guardada.' });
    },
  });

  const connect = useMutation({
    mutationFn: () => notificationsService.baileysConnect(),
    onSuccess: () => setStatusMessage({ ok: true, text: 'Iniciando conexión…' }),
    onError: (err: any) =>
      setStatusMessage({ ok: false, text: err?.response?.data?.detail || 'Error al conectar.' }),
  });
  const logout = useMutation({
    mutationFn: () => notificationsService.baileysLogout(),
    onSuccess: () => setStatusMessage({ ok: true, text: 'Sesión cerrada.' }),
  });
  const test = useMutation({
    mutationFn: () =>
      notificationsService.testChannel('whatsapp', { recipient: testRecipient }),
    onSuccess: () => setStatusMessage({ ok: true, text: 'Mensaje de prueba enviado.' }),
    onError: (err: any) =>
      setStatusMessage({ ok: false, text: err?.response?.data?.detail || 'Fallo al enviar prueba.' }),
  });

  const statusLabel: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
    not_connected: { label: 'Desconectado', color: 'default' },
    connecting: { label: 'Conectando…', color: 'warning' },
    waiting_qr: { label: 'Esperando escaneo de QR', color: 'warning' },
    connected: { label: 'Conectado', color: 'success' },
    requires_reauth: { label: 'Se requiere reautenticar', color: 'error' },
    error: { label: 'Error', color: 'error' },
  };

  if (loadingConfig) return <CircularProgress />;
  const chip = status ? statusLabel[status.status] : undefined;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          WhatsApp (Baileys)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Conecta una cuenta de WhatsApp escaneando un código QR. La sesión queda persistida en el
          servicio baileys y se reconecta automáticamente si se cae.
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Chip
            label={chip?.label ?? 'Desconocido'}
            color={chip?.color ?? 'default'}
            variant="filled"
          />
          <Button
            variant="contained"
            startIcon={<QrCode2 />}
            onClick={() => connect.mutate()}
            disabled={connect.isPending || status?.status === 'connected'}
          >
            Conectar WhatsApp
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => logout.mutate()}
            disabled={logout.isPending || status?.status === 'not_connected'}
          >
            Cerrar sesión
          </Button>
          <IconButton
            onClick={() => queryClient.invalidateQueries({ queryKey: ['notif', 'baileys'] })}
            aria-label="Refrescar"
          >
            <RefreshIcon />
          </IconButton>
        </Stack>

        {status?.lastError && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Último error: {status.lastError}
          </Alert>
        )}

        {qr?.qrDataUrl && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" gutterBottom>
              Abre WhatsApp en tu teléfono → Ajustes → Dispositivos vinculados → Vincular dispositivo,
              y escanea este código:
            </Typography>
            <Box
              component="img"
              src={qr.qrDataUrl}
              alt="WhatsApp QR"
              sx={{ width: 260, height: 260, mt: 1 }}
            />
            <Typography variant="caption" display="block">
              Generado: {new Date(qr.generatedAt).toLocaleTimeString()}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Prueba de envío
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Número destino (con clave de país, sin signos)"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              sx={{ minWidth: 320 }}
              placeholder="525555555555"
            />
            <Button
              variant="outlined"
              onClick={() => {
                saveConfig.mutate({
                  enabled: config?.enabled ?? true,
                  credentials: {},
                  from_address: config?.from_address,
                  test_recipient: testRecipient,
                });
              }}
              disabled={saveConfig.isPending}
            >
              Guardar número
            </Button>
            <Button
              variant="contained"
              onClick={() => test.mutate()}
              disabled={test.isPending || status?.status !== 'connected' || !testRecipient}
            >
              Enviar prueba
            </Button>
          </Stack>
        </Box>

        {statusMessage && (
          <Alert severity={statusMessage.ok ? 'success' : 'error'} sx={{ mt: 2 }} onClose={() => setStatusMessage(null)}>
            {statusMessage.text}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function useQueryHydration<T>(data: T | null | undefined, fn: (data: T) => void) {
  const [done, setDone] = useState(false);
  if (!done && data) {
    fn(data);
    setDone(true);
  }
}

export default function NotificationIntegrations() {
  const [tab, setTab] = useState<NotificationChannel>('email');
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notificaciones
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Configura los canales por los que los ciudadanos reciben avances de sus trámites.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 2, mb: 3 }}>
        <Tab value="email" label="Correo" />
        <Tab value="whatsapp" label="WhatsApp" />
      </Tabs>
      {tab === 'email' ? <EmailTab /> : <WhatsAppTab />}
    </Box>
  );
}
