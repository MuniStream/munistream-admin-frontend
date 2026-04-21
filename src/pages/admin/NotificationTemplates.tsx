import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsService,
  type NotificationChannel,
  type NotificationTemplate,
  type NotificationTemplateInput,
} from '@/services/notifications';

const TEMPLATES_KEY = ['notif', 'templates'];

const defaultForm = (): NotificationTemplateInput => ({
  key: '',
  locale: 'es',
  channel: 'email',
  subject: '',
  body: '',
  variables_doc: '',
  active: true,
});

const VARIABLES_HELP = `Variables disponibles:
- {{ ciudadano.nombre }}, {{ ciudadano.email }}, {{ ciudadano.telefono }}
- {{ workflow.id }}, {{ workflow.nombre }}
- {{ paso.id }}, {{ paso.nombre }}
- {{ instancia.id }}, {{ instancia.folio }}
- {{ evento.tipo }}, {{ evento.datos }}
- {{ url_tramite }}
`;

export default function NotificationTemplates() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => notificationsService.listTemplates(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NotificationTemplateInput>(defaultForm);
  const [previewText, setPreviewText] = useState<{ subject: string | null; body: string } | null>(null);
  const [alert, setAlert] = useState<{ ok: boolean; text: string } | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setPreviewText(null);
    setDialogOpen(true);
  };
  const openEdit = (tpl: NotificationTemplate) => {
    setEditingId(tpl.id);
    setForm({
      key: tpl.key,
      locale: tpl.locale,
      channel: tpl.channel,
      subject: tpl.subject ?? '',
      body: tpl.body,
      variables_doc: tpl.variables_doc ?? '',
      active: tpl.active,
    });
    setPreviewText(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, subject: form.channel === 'email' ? form.subject : null };
      if (editingId) return notificationsService.updateTemplate(editingId, payload);
      return notificationsService.createTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      setDialogOpen(false);
      setAlert({ ok: true, text: 'Plantilla guardada.' });
    },
    onError: (err: any) =>
      setAlert({ ok: false, text: err?.response?.data?.detail || 'Error al guardar la plantilla.' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
      setAlert({ ok: true, text: 'Plantilla eliminada.' });
    },
  });

  const preview = useMutation({
    mutationFn: () =>
      notificationsService.previewTemplate({
        subject: form.channel === 'email' ? form.subject : null,
        body: form.body,
        channel: form.channel,
      }),
    onSuccess: (data) => setPreviewText(data),
    onError: (err: any) =>
      setAlert({ ok: false, text: err?.response?.data?.detail || 'Error al renderizar preview.' }),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Plantillas de notificación</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          Nueva plantilla
        </Button>
      </Stack>

      {alert && (
        <Alert severity={alert.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.text}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Clave</TableCell>
              <TableCell>Idioma</TableCell>
              <TableCell>Canal</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell align="center">Activa</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Cargando…</TableCell>
              </TableRow>
            )}
            {!isLoading && (templates ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>Sin plantillas. Crea la primera con el botón superior.</TableCell>
              </TableRow>
            )}
            {templates?.map((tpl) => (
              <TableRow key={tpl.id} hover>
                <TableCell>{tpl.key}</TableCell>
                <TableCell>{tpl.locale}</TableCell>
                <TableCell>
                  <Chip label={tpl.channel} size="small" />
                </TableCell>
                <TableCell>{tpl.subject || '—'}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={tpl.active ? 'Sí' : 'No'}
                    color={tpl.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(tpl)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      if (confirm(`¿Eliminar plantilla ${tpl.key} (${tpl.locale}/${tpl.channel})?`)) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Clave"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                required
                helperText="Ej: step_completed, approval_requested"
                fullWidth
              />
              <TextField
                label="Idioma"
                select
                value={form.locale}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="en">Inglés</MenuItem>
              </TextField>
              <TextField
                label="Canal"
                select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as NotificationChannel })}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="email">Correo</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
              </TextField>
            </Stack>
            {form.channel === 'email' && (
              <TextField
                label="Asunto"
                value={form.subject ?? ''}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                fullWidth
              />
            )}
            <TextField
              label="Cuerpo (Jinja2)"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              multiline
              minRows={10}
              fullWidth
              required
            />
            <Typography variant="caption" color="text.secondary" whiteSpace="pre-line">
              {VARIABLES_HELP}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <Typography variant="body2">Plantilla activa</Typography>
            </Stack>
            {previewText && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vista previa con datos de ejemplo
                </Typography>
                {previewText.subject && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Asunto:</strong> {previewText.subject}
                  </Typography>
                )}
                <Typography variant="body2" whiteSpace="pre-wrap">
                  {previewText.body}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<VisibilityIcon />} onClick={() => preview.mutate()}>
            Vista previa
          </Button>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.key || !form.body}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
