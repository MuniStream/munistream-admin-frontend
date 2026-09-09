import { useMemo } from 'react';
import {
  Box, Checkbox, IconButton, LinearProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Tooltip, Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatApiDate, timeAgo } from '@/utils/dates';
import StatusChip from '@/components/ui/StatusChip';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Forma común de una fila, la devuelvan las asignaciones o el listado general.
 *
 * Los dos endpoints resolvían identificadores distintos, y por eso las dos
 * pantallas que los usaban acababan enseñando información distinta de los
 * mismos trámites. Ahora ambos devuelven esto.
 */
export interface TramiteRow {
  instance_id: string;
  workflow_name?: string | null;
  /** Trámite de origen: lo que identifica una validación administrativa. */
  parent_workflow_name?: string | null;
  citizen_name?: string | null;
  citizen_email?: string | null;
  status: string;
  workflow_status?: string | null;
  assigned_at?: string | null;
  /** Quién lo tiene asignado, por su nombre. */
  assigned_to_name?: string | null;
  created_at?: string | null;
  completion_percentage?: number;
}

interface Props {
  rows: TramiteRow[];
  total: number;
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (n: number) => void;
  /** Selección múltiple, para asignar en bloque. */
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Sin paginación ni selección: para el resumen del panel. */
  compact?: boolean;
  emptyMessage?: string;
}

const ESPERA_INICIO = ['waiting_for_start', 'pending_assignment'];

/**
 * La lista de trámites.
 *
 * Una sola tabla para las dos pantallas que la usan, con las mismas columnas y
 * el mismo comportamiento: pulsar una fila abre su expediente. Antes una
 * navegaba al expediente y la otra abría un diálogo con otros datos.
 */
export default function TramiteList({
  rows, total, loading, page, rowsPerPage, onPageChange, onRowsPerPageChange,
  selected, onSelectedChange, compact = false, emptyMessage,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const seleccionable = !!onSelectedChange && !compact;
  const idsPagina = useMemo(() => rows.map((r) => r.instance_id), [rows]);
  const todosMarcados = seleccionable && idsPagina.length > 0
    && idsPagina.every((id) => selected?.includes(id));

  const alternarTodos = () => {
    if (!onSelectedChange) return;
    onSelectedChange(todosMarcados ? [] : idsPagina);
  };

  const alternarUno = (id: string) => {
    if (!onSelectedChange || !selected) return;
    onSelectedChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const estadoDe = (r: TramiteRow) => r.workflow_status || r.status;

  if (loading && rows.length === 0) return <LoadingState variant="skeleton" rows={6} />;

  if (rows.length === 0) return <EmptyState description={emptyMessage || t('inbox.empty')} />;

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {seleccionable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={todosMarcados}
                    indeterminate={!todosMarcados && idsPagina.some((id) => selected?.includes(id))}
                    onChange={alternarTodos}
                    inputProps={{ 'aria-label': t('tramites.selectAll') }}
                  />
                </TableCell>
              )}
              <TableCell sx={{ width: '42%' }}>{t('inbox.colTramite')}</TableCell>
              <TableCell>{t('tramites.colAssignee')}</TableCell>
              <TableCell align="center">{t('status')}</TableCell>
              <TableCell align="center">{t('inbox.colAssigned')}</TableCell>
              <TableCell align="center">{t('inbox.colProgress')}</TableCell>
              <TableCell align="center">{t('inbox.colAction')}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((r) => {
              const estado = estadoDe(r);
              const necesitaInicio = ESPERA_INICIO.includes(estado);
              const marcado = !!selected?.includes(r.instance_id);

              return (
                <TableRow
                  key={r.instance_id}
                  hover
                  selected={marcado}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/instances/${r.instance_id}`)}
                >
                  {seleccionable && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={marcado} onChange={() => alternarUno(r.instance_id)} />
                    </TableCell>
                  )}

                  <TableCell>
                    {/* El trámite del ciudadano encabeza. Todas las validaciones
                        administrativas comparten nombre de flujo, así que
                        encabezar con él dejaba las filas indistinguibles. */}
                    <Typography variant="subtitle2" fontWeight={600}>
                      {r.parent_workflow_name || r.workflow_name || r.instance_id}
                    </Typography>
                    {r.parent_workflow_name && r.workflow_name && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {r.workflow_name}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {r.citizen_name || r.citizen_email || t('inbox.noCitizen')}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    {/* Sin esto no se ve si algo está en manos de alguien. */}
                    {r.assigned_to_name ? (
                      <Typography variant="body2" noWrap>{r.assigned_to_name}</Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled" noWrap>
                        {t('tramites.unassigned')}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <StatusChip status={estado} />
                  </TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={500}>
                      {timeAgo(r.assigned_at || r.created_at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatApiDate(r.assigned_at || r.created_at, { day: '2-digit', month: '2-digit' })}
                    </Typography>
                  </TableCell>

                  <TableCell align="center" sx={{ minWidth: 90 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round(r.completion_percentage ?? 0)}
                      sx={{ mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(r.completion_percentage ?? 0)}%
                    </Typography>
                  </TableCell>

                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={necesitaInicio ? t('tramites.start') : t('tramites.open')}>
                      <IconButton
                        size="small"
                        color={necesitaInicio ? 'success' : 'primary'}
                        onClick={() => navigate(`/instances/${r.instance_id}`)}
                      >
                        {necesitaInicio ? <PlayArrowIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {!compact && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage={t('tramites.perPage')}
        />
      )}
    </>
  );
}
