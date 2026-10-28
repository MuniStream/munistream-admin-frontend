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
 * Assign instances to a team and, optionally, to one of its members.
 *
 * Teams and their members live in Keycloak (groups): the backend lists the teams
 * the user may route to (admins: all; managers: their own) and the members of a
 * team with their Keycloak id, which is what an assignee needs to see the
 * instance afterwards.
 */
interface AssignableTeam {
  team_id: string;
  team_name: string;
  current_load: number;
  available: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  roles: string[];
}

interface Props {
  open: boolean;
  instanceIds: string[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * The backend has no bulk operation, so instances are assigned one by one; the
 * dialog waits for all of them and reports if any failed instead of treating the
 * whole operation as done.
 */
export default function AssignDialog({ open, instanceIds, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [team, setTeam] = useState('');
  const [member, setMember] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['assignable-teams'],
    queryFn: async () => (await api.get('/assignments/teams')).data as AssignableTeam[],
    enabled: open,
  });

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members', team],
    queryFn: async () =>
      (await api.get(`/assignments/teams/${encodeURIComponent(team)}/members`)).data as TeamMember[],
    enabled: open && !!team,
  });

  const assign = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        instanceIds.map(async (id) => {
          // Route to the team first: a member can only be chosen within the
          // instance's team.
          await api.post(`/assignments/${id}/assign`, { assign_to: { team } });
          if (member) {
            await api.post(`/assignments/${id}/assign`, { assign_to: { admin: member } });
          }
        }),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) throw new Error(String(failed));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tramites'] });
      queryClient.invalidateQueries({ queryKey: ['mi-bandeja'] });
      queryClient.invalidateQueries({ queryKey: ['mi-bandeja-resumen'] });
      setError(null);
      setTeam('');
      setMember('');
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
            value={team}
            onChange={(e) => { setTeam(e.target.value); setMember(''); }}
            inputProps={{ 'data-testid': 'assign-team' }}
          >
            {(teams ?? []).map((eq) => (
              <MenuItem key={eq.team_id} value={eq.team_id}>
                {eq.team_name}
                {' · '}
                {t('tramites.currentLoad', { count: eq.current_load })}
              </MenuItem>
            ))}
          </TextField>
        )}

        {team && (
          <TextField
            select
            fullWidth
            sx={{ mt: 2 }}
            label={t('tramites.assignToMember')}
            value={member}
            onChange={(e) => setMember(e.target.value)}
            disabled={loadingMembers}
            helperText={t('tramites.assignToMemberHint')}
            inputProps={{ 'data-testid': 'assign-member' }}
          >
            <MenuItem value="">{t('tramites.wholeTeam')}</MenuItem>
            {(members ?? []).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
                {m.roles.length > 0 && ` · ${m.roles.map((r) => t(`roleLabels.${r}`, { defaultValue: r })).join(', ')}`}
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
          disabled={!team || assign.isPending}
          onClick={() => assign.mutate()}
        >
          {t('tramites.assignConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
