import { useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import PageContainer from '@/components/ui/PageContainer';
import TramiteList, { type TramiteRow } from '@/components/tramites/TramiteList';
import AssignDialog from '@/components/tramites/AssignDialog';

const ESTADOS = ['running', 'paused', 'completed', 'failed', 'cancelled'];

/**
 * Trámites: todos los del organismo, para consultar y asignar.
 *
 * Sustituye a «Seguimiento ciudadano», que mostraba una tabla distinta de la
 * bandeja —otras columnas, otros datos, y al pulsar una fila abría un diálogo en
 * vez de llevar al expediente— aunque fueran los mismos trámites.
 */
export default function TramitesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [asignando, setAsignando] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tramites', page, rowsPerPage, estado, busqueda],
    queryFn: async () => {
      const { data } = await api.get('/instances/', {
        params: {
          page: page + 1,
          page_size: rowsPerPage,
          ...(estado ? { status: estado } : {}),
          ...(busqueda ? { instance_id: busqueda } : {}),
        },
      });
      return data as { instances: TramiteRow[]; total: number };
    },
  });

  return (
    <PageContainer
      title={t('nav.tramites')}
      actions={
        seleccion.length > 0 ? (
          <Button size="small" variant="contained" onClick={() => setAsignando(true)}>
            {t('tramites.assignSelected', { count: seleccion.length })}
          </Button>
        ) : undefined
      }
    >
      <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder={t('tramites.searchPlaceholder')}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPage(0); }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              select
              label={t('filterByStatus')}
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPage(0); }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">{t('allStatuses')}</MenuItem>
              {ESTADOS.map((e) => (
                <MenuItem key={e} value={e}>
                  {t(`analytics.status.${e}`, { defaultValue: e })}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {seleccion.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('tramites.selectedCount', { count: seleccion.length })}
            </Typography>
          )}
        </Box>

        <TramiteList
          rows={data?.instances ?? []}
          total={data?.total ?? 0}
          loading={isLoading}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
          selected={seleccion}
          onSelectedChange={setSeleccion}
          emptyMessage={t('tramites.empty')}
          onRefresh={refetch}
        />

      <AssignDialog
        open={asignando}
        instanceIds={seleccion}
        onClose={() => setAsignando(false)}
        onDone={() => { setAsignando(false); setSeleccion([]); }}
      />
    </PageContainer>
  );
}
