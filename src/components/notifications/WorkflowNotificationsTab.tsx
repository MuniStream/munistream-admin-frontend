import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputLabel,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsService,
  type NotificationChannel,
  type NotificationTrigger,
  type NotificationTriggerInput,
} from '@/services/notifications';

const EVENT_TYPES = [
  { value: 'started', label: 'Instancia iniciada' },
  { value: 'completed', label: 'Instancia completada' },
  { value: 'failed', label: 'Instancia falló' },
  { value: 'paused', label: 'Instancia pausada' },
  { value: 'resumed', label: 'Instancia reanudada' },
  { value: 'approval_requested', label: 'Aprobación solicitada' },
  { value: 'approval_completed', label: 'Aprobación resuelta' },
  { value: 'entity_created', label: 'Entidad creada' },
];

interface WorkflowLike {
  steps?: Array<{ step_id?: string; id?: string; name?: string }>;
}

interface Props {
  workflowId: string;
  workflowData?: WorkflowLike;
}

const defaultForm = (workflowId: string): NotificationTriggerInput => ({
  workflow_id: workflowId,
  step_id: null,
  event_type: 'completed',
  template_key: '',
  channels: ['email'],
  active: true,
});

export default function WorkflowNotificationsTab({ workflowId, workflowData }: Props) {
  const queryClient = useQueryClient();
  const triggersQuery = useQuery({
    queryKey: ['notif', 'triggers', workflowId],
    queryFn: () => notificationsService.listTriggers(workflowId),
  });
  const templatesQuery = useQuery({
    queryKey: ['notif', 'templates'],
    queryFn: () => notificationsService.listTemplates(),
  });

  const stepsOptions = useMemo(() => {
    const steps = workflowData?.steps ?? [];
    return steps.map((s) => ({
      id: s.step_id ?? s.id ?? '',
      name: s.name ?? s.step_id ?? s.id ?? '',
    }));
  }, [workflowData]);

  const templateKeys = useMemo(() => {
    const keys = new Set<string>();
    (templatesQuery.data ?? []).forEach((t) => keys.add(t.key));
    return Array.from(keys).sort();
  }, [templatesQuery.data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NotificationTriggerInput>(() => defaultForm(workflowId));
  const [alert, setAlert] = useState<{ ok: boolean; text: string } | null>(null);

  const openCreate = (preselectedStepId?: string | null) => {
    setEditingId(null);
    setForm({ ...defaultForm(workflowId), step_id: preselectedStepId ?? null });
    setDialogOpen(true);
  };

  const openEdit = (trg: NotificationTrigger) => {
    setEditingId(trg.id);
    setForm({
      workflow_id: trg.workflow_id,
      step_id: trg.step_id,
      event_type: trg.event_type,
      template_key: trg.template_key,
      channels: trg.channels,
      active: trg.active,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, step_id: form.step_id || null };
      return editingId
        ? notificationsService.updateTrigger(editingId, payload)
        : notificationsService.createTrigger(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif', 'triggers', workflowId] });
      setDialogOpen(false);
      setAlert({ ok: true, text: 'Trigger guardado.' });
    },
    onError: (err: any) =>
      setAlert({ ok: false, text: err?.response?.data?.detail || 'Error al guardar el trigger.' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsService.deleteTrigger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notif', 'triggers', workflowId] });
      setAlert({ ok: true, text: 'Trigger eliminado.' });
    },
  });

  const toggleChannel = (channel: NotificationChannel) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6">Triggers de notificación</Typography>
          <Typography variant="body2" color="text.secondary">
            Define qué eventos del flujo disparan una notificación al ciudadano y con qué plantilla.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCreate(null)}>
          Agregar trigger
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
              <TableCell>Evento</TableCell>
              <TableCell>Paso</TableCell>
              <TableCell>Plantilla</TableCell>
              <TableCell>Canales</TableCell>
              <TableCell align="center">Activo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {triggersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Cargando…</TableCell>
              </TableRow>
            )}
            {!triggersQuery.isLoading && (triggersQuery.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>Sin triggers para este workflow.</TableCell>
              </TableRow>
            )}
            {triggersQuery.data?.map((trg) => (
              <TableRow key={trg.id} hover>
                <TableCell>
                  {EVENT_TYPES.find((e) => e.value === trg.event_type)?.label || trg.event_type}
                </TableCell>
                <TableCell>{trg.step_id || 'Cualquier paso'}</TableCell>
                <TableCell>{trg.template_key}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {trg.channels.map((c) => (
                      <Chip key={c} label={c} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={trg.active ? 'Sí' : 'No'}
                    color={trg.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(trg)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      if (confirm('¿Eliminar este trigger?')) deleteMutation.mutate(trg.id);
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar trigger' : 'Nuevo trigger'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Evento</InputLabel>
              <Select
                label="Evento"
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: String(e.target.value) })}
              >
                {EVENT_TYPES.map((et) => (
                  <MenuItem key={et.value} value={et.value}>
                    {et.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {stepsOptions.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel>Paso (opcional)</InputLabel>
                <Select
                  label="Paso (opcional)"
                  value={form.step_id ?? ''}
                  onChange={(e) => setForm({ ...form, step_id: String(e.target.value) || null })}
                >
                  <MenuItem value="">Cualquier paso</MenuItem>
                  {stepsOptions.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="ID de paso (opcional)"
                value={form.step_id ?? ''}
                onChange={(e) => setForm({ ...form, step_id: e.target.value || null })}
                fullWidth
                helperText="Déjalo vacío para disparar en cualquier paso del workflow."
              />
            )}

            {templateKeys.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel>Plantilla (clave)</InputLabel>
                <Select
                  label="Plantilla (clave)"
                  value={form.template_key}
                  onChange={(e) => setForm({ ...form, template_key: String(e.target.value) })}
                >
                  {templateKeys.map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Clave de plantilla"
                value={form.template_key}
                onChange={(e) => setForm({ ...form, template_key: e.target.value })}
                fullWidth
                helperText="Crea plantillas en Ajustes → Notificaciones → Plantillas."
              />
            )}

            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.channels.includes('email')}
                    onChange={() => toggleChannel('email')}
                  />
                }
                label="Correo"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.channels.includes('whatsapp')}
                    onChange={() => toggleChannel('whatsapp')}
                  />
                }
                label="WhatsApp"
              />
            </FormGroup>

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
              }
              label="Trigger activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              !form.template_key ||
              form.channels.length === 0 ||
              !form.event_type
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
