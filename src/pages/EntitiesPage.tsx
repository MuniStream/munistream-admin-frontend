import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import PageContainer from '@/components/ui/PageContainer';

interface EntityRow {
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  verified: boolean;
  owner_user_id: string;
  created_at: string;
  identificadores: Record<string, string>;
}

interface Faceta {
  entity_type: string;
  total: number;
}

/**
 * Entidades: embarcaciones, permisos, credenciales y demás documentos emitidos.
 *
 * Hasta ahora solo se podían consultar desde el portal ciudadano, siempre
 * acotadas a su dueño, así que el personal no tenía forma de encontrar una
 * entidad sin saber de antemano de quién era.
 */
export default function EntitiesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');

  // Sin esperar, cada tecla dispara una consulta que recorre la colección.
  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(texto);
      setPage(0);
    }, 350);
    return () => clearTimeout(id);
  }, [texto]);

  const { data, isLoading } = useQuery({
    queryKey: ['entities', page, rowsPerPage, busqueda, tipo],
    queryFn: async () => {
      const { data } = await api.get('/entities/', {
        params: {
          page: page + 1,
          page_size: rowsPerPage,
          ...(busqueda ? { q: busqueda } : {}),
          ...(tipo ? { entity_type: tipo } : {}),
        },
      });
      return data as { entities: EntityRow[]; total: number; tipos: Faceta[] };
    },
    placeholderData: (previo) => previo,
  });

  const filas = data?.entities ?? [];

  return (
    <PageContainer title={t('nav.entities', { defaultValue: 'Entidades' })}>
      <Box sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder={t('entities.searchPlaceholder', {
              defaultValue: 'Buscar por nombre, identificador, RFC, CURP, RNPA, matrícula o folio',
            })}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            select
            label={t('entities.filterByType', { defaultValue: 'Tipo de entidad' })}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">
              {t('entities.allTypes', { defaultValue: 'Todos los tipos' })}
            </MenuItem>
            {(data?.tipos ?? []).map((f) => (
              <MenuItem key={f.entity_type} value={f.entity_type}>
                {f.entity_type} ({f.total})
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('entities.name', { defaultValue: 'Nombre' })}</TableCell>
              <TableCell>{t('entities.type', { defaultValue: 'Tipo' })}</TableCell>
              <TableCell>
                {t('entities.identifiers', { defaultValue: 'Identificadores' })}
              </TableCell>
              <TableCell>{t('entities.status', { defaultValue: 'Estado' })}</TableCell>
              <TableCell>{t('entities.createdAt', { defaultValue: 'Emitida' })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filas.map((e) => (
              <TableRow key={e.entity_id} hover>
                <TableCell>
                  <Typography variant="body2">{e.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {e.entity_id}
                  </Typography>
                </TableCell>
                <TableCell>{e.entity_type}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {Object.entries(e.identificadores || {}).map(([clave, valor]) => (
                      <Chip
                        key={clave}
                        size="small"
                        variant="outlined"
                        label={`${clave.toUpperCase()}: ${valor}`}
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={e.status}
                    color={e.status === 'active' ? 'success' : 'default'}
                  />
                  {e.verified && (
                    <Chip
                      size="small"
                      sx={{ ml: 0.5 }}
                      color="info"
                      label={t('entities.verified', { defaultValue: 'Verificada' })}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }} align="center">
                    {t('entities.empty', {
                      defaultValue: 'No se encontraron entidades con esos criterios.',
                    })}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage={t('table.rowsPerPage', { defaultValue: 'Filas por página:' })}
          labelDisplayedRows={({ from, to, count }) =>
            t('table.displayedRows', {
              from,
              to,
              count,
              defaultValue: `${from}–${to} de ${count}`,
            })
          }
        />
      </TableContainer>
    </PageContainer>
  );
}
