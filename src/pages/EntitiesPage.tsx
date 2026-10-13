import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
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
  valid_until: string | null;
  identificadores: Record<string, string>;
}

interface FacetValue {
  value: string;
  count: number;
}
interface FacetGroup {
  key: string;
  field: string; // ruta de Mongo con la que se filtra de vuelta
  label: string;
  type: 'enum' | 'validity' | 'address' | 'geo';
  values: FacetValue[];
}

// Campos que el backend enruta por parámetro propio (no por `f` genérico),
// porque viven en la raíz del documento, no bajo `data.`.
const SINGLE_PARAM: Record<string, 'entity_type' | 'status' | 'validity'> = {
  entity_type: 'entity_type',
  status: 'status',
  validity: 'validity',
};

// Tokens técnicos -> etiqueta legible (vigencia y geo).
const VALUE_LABELS: Record<string, string> = {
  valid: 'Vigente',
  expired: 'Vencida',
  no_expiry: 'Sin vigencia',
  has_location: 'Con ubicación',
  no_location: 'Sin ubicación',
};

/**
 * Entidades / Documentos: explorador por facetas (facet explorer) genérico.
 *
 * Las facetas (tipo, subtipo, estado, vigencia y, autodetectados del dato,
 * municipio/estado/CP de las direcciones y presencia de geometrías) las calcula
 * el backend; aquí solo se pintan con sus conteos y se combinan como filtros.
 */
export default function EntitiesPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  // Selección por faceta: campo -> valores elegidos.
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const id = setTimeout(() => {
      setBusqueda(texto);
      setPage(0);
    }, 350);
    return () => clearTimeout(id);
  }, [texto]);

  const toggle = (field: string, value: string) => {
    setSelected((prev) => {
      const actual = prev[field] || [];
      const single = field in SINGLE_PARAM;
      let siguiente: string[];
      if (actual.includes(value)) siguiente = actual.filter((v) => v !== value);
      else siguiente = single ? [value] : [...actual, value];
      const copia = { ...prev };
      if (siguiente.length) copia[field] = siguiente;
      else delete copia[field];
      return copia;
    });
    setPage(0);
  };

  const limpiar = () => {
    setSelected({});
    setPage(0);
  };

  const seleccionTotal = useMemo(
    () => Object.values(selected).reduce((n, vs) => n + vs.length, 0),
    [selected],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['entities', page, rowsPerPage, busqueda, selected],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page + 1));
      sp.set('page_size', String(rowsPerPage));
      if (busqueda) sp.set('q', busqueda);
      for (const [field, values] of Object.entries(selected)) {
        if (!values.length) continue;
        const param = SINGLE_PARAM[field];
        if (param) sp.set(param, values[0]);
        else values.forEach((v) => sp.append('f', `${field}:${v}`));
      }
      const { data } = await api.get(`/entities/?${sp.toString()}`);
      return data as {
        entities: EntityRow[];
        total: number;
        facets: FacetGroup[];
      };
    },
    placeholderData: (previo) => previo,
  });

  const filas = data?.entities ?? [];
  const facets = data?.facets ?? [];
  const etiquetaValor = (v: string) => VALUE_LABELS[v] ?? v;

  return (
    <PageContainer title={t('nav.entities', { defaultValue: 'Documentos' })}>
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder={t('entities.searchPlaceholder', {
            defaultValue: 'Buscar por nombre, identificador, RFC, CURP, RNPA, matrícula o folio',
          })}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ px: 2, pb: 2 }} alignItems="flex-start">
        {/* Panel de facetas */}
        <Paper variant="outlined" sx={{ p: 1.5, width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">
              {t('entities.facets', { defaultValue: 'Filtros' })}
            </Typography>
            {seleccionTotal > 0 && (
              <Chip
                size="small"
                label={t('entities.clear', { defaultValue: `Limpiar (${seleccionTotal})`, count: seleccionTotal })}
                onClick={limpiar}
                onDelete={limpiar}
              />
            )}
          </Stack>
          {facets.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              {t('entities.noFacets', { defaultValue: 'Sin filtros disponibles.' })}
            </Typography>
          )}
          <Stack spacing={1.5} sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {facets.map((g) => (
              <Box key={g.key}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {g.label}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {g.values.map((v) => {
                    const activo = (selected[g.field] || []).includes(v.value);
                    return (
                      <Chip
                        key={v.value}
                        size="small"
                        variant={activo ? 'filled' : 'outlined'}
                        color={activo ? 'primary' : 'default'}
                        label={`${etiquetaValor(v.value)} (${v.count})`}
                        onClick={() => toggle(g.field, v.value)}
                      />
                    );
                  })}
                </Box>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Lista */}
        <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, width: '100%' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('entities.name', { defaultValue: 'Nombre' })}</TableCell>
                <TableCell>{t('entities.type', { defaultValue: 'Tipo' })}</TableCell>
                <TableCell>{t('entities.identifiers', { defaultValue: 'Identificadores' })}</TableCell>
                <TableCell>{t('entities.status', { defaultValue: 'Estado' })}</TableCell>
                <TableCell>{t('entities.createdAt', { defaultValue: 'Emitida' })}</TableCell>
                <TableCell>{t('entities.validity', { defaultValue: 'Validez' })}</TableCell>
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
                        <Chip key={clave} size="small" variant="outlined" label={`${clave.toUpperCase()}: ${valor}`} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={e.status} color={e.status === 'active' ? 'success' : 'default'} />
                    {e.verified && (
                      <Chip size="small" sx={{ ml: 0.5 }} color="info" label={t('entities.verified', { defaultValue: 'Verificada' })} />
                    )}
                  </TableCell>
                  <TableCell>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    {e.valid_until ? (
                      (() => {
                        const vencida = new Date(e.valid_until) < new Date();
                        return (
                          <Chip
                            size="small"
                            variant={vencida ? 'filled' : 'outlined'}
                            color={vencida ? 'error' : 'success'}
                            label={
                              vencida
                                ? t('entities.expired', {
                                    date: new Date(e.valid_until).toLocaleDateString(),
                                    defaultValue: `Vencida ${new Date(e.valid_until).toLocaleDateString()}`,
                                  })
                                : new Date(e.valid_until).toLocaleDateString()
                            }
                          />
                        );
                      })()
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('entities.noExpiry', { defaultValue: 'Sin vigencia' })}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }} align="center">
                      {t('entities.empty', { defaultValue: 'No se encontraron documentos con esos criterios.' })}
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
              t('table.displayedRows', { from, to, count, defaultValue: `${from}–${to} de ${count}` })
            }
          />
        </TableContainer>
      </Stack>
    </PageContainer>
  );
}
