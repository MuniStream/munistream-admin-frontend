import {
  Alert, Box, Chip, CircularProgress, Divider, Drawer, IconButton, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useTranslation } from 'react-i18next';
import { useCitizenEntity } from '@/hooks/useInstanceDetail';
import { isBlobDescriptor, isRedacted, isTruncated } from '@/types/instanceDetail';
import type { WalletEntity } from '@/types/instanceDetail';

interface Props {
  instanceId?: string;
  entityId: string | null;
  /** Resumen ya disponible en la cartera, para pintar sin esperar a la red. */
  summary?: WalletEntity;
  onClose: () => void;
}

function ValorCampo({ value }: { value: unknown }) {
  const { t } = useTranslation();

  if (isRedacted(value)) {
    return <Chip size="small" color="warning" variant="outlined" label={t('instDetail.contextRedacted')} />;
  }
  if (isBlobDescriptor(value) || isTruncated(value)) {
    const size = (value as { size?: number }).size;
    return (
      <Chip
        size="small"
        variant="outlined"
        label={t('instDetail.contextTruncated', { size: size ? Math.round(size / 1024) : '?' })}
      />
    );
  }
  if (value === null || value === undefined || value === '') {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  if (typeof value === 'object') {
    return (
      <Box component="pre" sx={{
        m: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        color: 'text.secondary',
      }}>
        {JSON.stringify(value, null, 2)}
      </Box>
    );
  }
  return <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{String(value)}</Typography>;
}

/**
 * Detalle de una entidad, en panel lateral derecho.
 *
 * Se eligió un panel y no un diálogo centrado porque un diálogo taparía el
 * encabezado, que es justo lo que debe permanecer visible.
 *
 * `disableScrollLock` es imprescindible: por omisión MUI bloquea el scroll del
 * documento y compensa el ancho de la barra de desplazamiento con relleno, lo
 * que congela la página de fondo y desplaza lateralmente el encabezado
 * pegajoso al abrir el panel.
 */
export default function EntityDetailDrawer({ instanceId, entityId, summary, onClose }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useCitizenEntity(instanceId, entityId);

  const titulo = data?.name || summary?.name || t('instDetail.entityDrawerTitle');
  const tipo = data?.entity_type_label || summary?.entity_type_label;
  const verificada = data?.verified ?? summary?.verified;

  return (
    <Drawer
      anchor="right"
      open={!!entityId}
      onClose={onClose}
      slotProps={{ backdrop: { invisible: true } }}
      ModalProps={{ disableScrollLock: true, keepMounted: false }}
      PaperProps={{ sx: { width: 'clamp(320px, 38vw, 640px)' } }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap title={titulo}>{titulo}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {tipo && <Chip size="small" variant="outlined" label={tipo} />}
            {verificada && (
              <Chip size="small" color="success" icon={<VerifiedIcon />} label={t('instDetail.entityVerified')} />
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label={t('instDetail.close')}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{t('instDetail.loadError')}</Alert>}

        {data && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 35%) minmax(0, 1fr)', gap: 1 }}>
            {Object.entries(data.data).map(([campo, valor]) => (
              <Box key={campo} sx={{ display: 'contents' }}>
                <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25 }}>
                  {campo}
                </Typography>
                <ValorCampo value={valor} />
              </Box>
            ))}
          </Box>
        )}

        {data && Object.keys(data.data).length === 0 && (
          <Typography variant="body2" color="text.secondary">{t('instDetail.contextEmpty')}</Typography>
        )}
      </Box>
    </Drawer>
  );
}
