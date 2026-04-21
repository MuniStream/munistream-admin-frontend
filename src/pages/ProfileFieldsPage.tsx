import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RestoreIcon from '@mui/icons-material/Restore';
import ProfileFieldForm from '../components/ProfileFieldForm';
import profileFieldsService, {
  type CreateProfileFieldPayload,
  type ProfileField,
} from '../services/profileFieldsService';

export default function ProfileFieldsPage() {
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileField | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await profileFieldsService.list();
      setFields(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al cargar los campos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (field: ProfileField) => {
    setEditing(field);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: CreateProfileFieldPayload) => {
    try {
      if (editing) {
        const { field_id: _fid, ...updatePayload } = payload;
        await profileFieldsService.update(editing.field_id, updatePayload);
      } else {
        await profileFieldsService.create({ ...payload, order: fields.length });
      }
      setFormOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al guardar');
    }
  };

  const handleSoftDelete = async (field: ProfileField) => {
    if (!window.confirm(`¿Desactivar el campo "${field.label}"?`)) return;
    try {
      await profileFieldsService.softDelete(field.field_id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al desactivar');
    }
  };

  const handleReactivate = async (field: ProfileField) => {
    try {
      await profileFieldsService.update(field.field_id, { active: true });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al reactivar');
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const items = reordered.map((f, i) => ({ field_id: f.field_id, order: i }));
    try {
      const updated = await profileFieldsService.reorder(items);
      setFields(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al reordenar');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Campos del Perfil de Usuario
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configura los campos que los ciudadanos pueden llenar en su perfil. Estos valores pre-llenan los trámites automáticamente.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
          Nuevo campo
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Orden</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Etiqueta</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Obligatorio</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay campos configurados. Crea el primero con el botón "Nuevo campo".
                </TableCell>
              </TableRow>
            )}
            {fields.map((f, idx) => (
              <TableRow key={f.field_id} sx={{ opacity: f.active ? 1 : 0.55 }}>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton size="small" onClick={() => handleMove(idx, -1)} disabled={idx === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === fields.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption">{f.order}</Typography>
                  </Stack>
                </TableCell>
                <TableCell><code>{f.field_id}</code></TableCell>
                <TableCell>{f.label}</TableCell>
                <TableCell>{f.type}</TableCell>
                <TableCell>{f.required ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  <Chip
                    label={f.active ? 'Activo' : 'Inactivo'}
                    color={f.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleEdit(f)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {f.active ? (
                    <Tooltip title="Desactivar">
                      <IconButton size="small" onClick={() => handleSoftDelete(f)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Reactivar">
                      <IconButton size="small" onClick={() => handleReactivate(f)}>
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ProfileFieldForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
