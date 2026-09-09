import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Se asigna a equipo, no a persona.
 *
 * El personal vive en Keycloak: la colección de usuarios de la base de datos
 * está vacía, así que un desplegable de personas no tendría a quién ofrecer. Los
 * equipos son lo que los trámites usan realmente.
 */
interface EquipoAsignable {
  team_id: string;
  team_name: string;
  current_load: number;
  available: boolean;
}

interface Props {
  open: boolean;
  instanceIds: string[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * Asignar trámites a un revisor.
 *
 * Se asigna uno a uno porque el backend no tiene operación en bloque; el
 * diálogo espera a todos y reporta si alguno falló, en vez de dar por buena la
 * operación entera.
 */
export default function AssignDialog({ open, instanceIds, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [equipo, setEquipo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: equipos, isLoading } = useQuery({
    queryKey: ['equipos-asignables'],
    queryFn: async () => (await api.get('/assignments/teams')).data as EquipoAsignable[],
    enabled: open,
  });

  const asignar = useMutation({
    mutationFn: async () => {
      const resultados = await Promise.allSettled(
        instanceIds.map((id) =>
          api.post(`/assignments/${id}/assign`, {
            assign_to: { team_id: equipo },
            assignment_type: 'manual',
          }),
        ),
      );
      const fallidos = resultados.filter((r) => r.status === 'rejected').length;
      if (fallidos > 0) throw new Error(String(fallidos));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramites'] });
      queryClient.invalidateQueries({ queryKey: ['mi-bandeja'] });
      queryClient.invalidateQueries({ queryKey: ['mi-bandeja-resumen'] });
      setError(null);
      onDone();
    },
    onError: () => setError(t('tramites.assignError')),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('tramites.assignTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('tramites.selectedCount', { count: instanceIds.length })}
        </Typography>

        {isLoading ? (
          <LoadingState variant="skeleton" rows={3} />
        ) : (
          <TextField
            select
            fullWidth
            label={t('tramites.assignTo')}
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
          >
            {(equipos ?? []).map((eq) => (
              <MenuItem key={eq.team_id} value={eq.team_id}>
                {eq.team_name}
                {' · '}
                {t('tramites.currentLoad', { count: eq.current_load })}
              </MenuItem>
            ))}
          </TextField>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('close')}</Button>
        <Button
          variant="contained"
          disabled={!equipo || asignar.isPending}
          onClick={() => asignar.mutate()}
        >
          {t('tramites.assignConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
