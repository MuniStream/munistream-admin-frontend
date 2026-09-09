import { useEffect, useState } from 'react';
import {
  Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import instanceDetailService from '@/services/instanceDetailService';
import type { DossierAttachment } from '@/types/instanceDetail';

interface Props {
  instanceId: string;
  attachment: DossierAttachment | null;
  onClose: () => void;
}

/**
 * Previsualización de un adjunto.
 *
 * El contenido se trae como Blob por axios (el endpoint exige token) y se
 * muestra desde un object URL, que se revoca al cerrar para no acumular
 * memoria durante una sesión larga de revisión.
 */
export default function AttachmentPreviewDialog({ instanceId, attachment, onClose }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!attachment) return;

    let objectUrl: string | null = null;
    let cancelado = false;

    setCargando(true);
    setError(false);

    instanceDetailService
      .fetchAttachment(instanceId, attachment.attachment_id)
      .then((blob) => {
        if (cancelado) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setCargando(false); });

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [instanceId, attachment]);

  const esImagen = attachment?.content_type?.startsWith('image/');
  const esPdf = attachment?.content_type === 'application/pdf';

  return (
    <Dialog open={!!attachment} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle1" noWrap sx={{ flex: 1 }}>
          {attachment?.filename}
        </Typography>
        <IconButton onClick={onClose} aria-label={t('instDetail.close')}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 420 }}>
        {cargando && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{t('instDetail.loadError')}</Alert>}

        {url && esImagen && (
          <Box component="img" src={url} alt={attachment?.filename}
            sx={{ maxWidth: '100%', display: 'block', mx: 'auto' }} />
        )}

        {url && esPdf && (
          <Box component="iframe" src={url} title={attachment?.filename}
            sx={{ width: '100%', height: '70vh', border: 0 }} />
        )}

        {url && !esImagen && !esPdf && (
          <Alert severity="info">{t('instDetail.attachmentNoPreview')}</Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
