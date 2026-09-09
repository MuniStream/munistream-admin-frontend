import { useState } from 'react';
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import instanceDetailService from '@/services/instanceDetailService';
import type { DossierAttachment } from '@/types/instanceDetail';

interface Props {
  instanceId: string;
  attachment: DossierAttachment;
  onPreview: (attachment: DossierAttachment) => void;
}

function formatoTamano(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconoPara(contentType: string | null) {
  if (!contentType) return <DescriptionIcon color="action" />;
  if (contentType.startsWith('image/')) return <ImageIcon color="action" />;
  if (contentType === 'application/pdf') return <PictureAsPdfIcon color="action" />;
  return <DescriptionIcon color="action" />;
}

export default function AttachmentCard({ instanceId, attachment, onPreview }: Props) {
  const { t } = useTranslation();
  const [descargando, setDescargando] = useState(false);

  // Sin copia en S3 no hay nada que servir: es un archivo legado que quedó
  // embebido en el contexto de un trámite antiguo.
  const servible = !!attachment.s3_key;

  /**
   * La descarga va por axios y no por un enlace: el endpoint exige el token de
   * sesión, y un `<a href>` no puede llevar la cabecera `Authorization`.
   */
  const descargar = async () => {
    setDescargando(true);
    let url: string | null = null;
    try {
      const blob = await instanceDetailService.fetchAttachment(instanceId, attachment.attachment_id);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      if (url) URL.revokeObjectURL(url);
      setDescargando(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {servible ? iconoPara(attachment.content_type) : <WarningAmberIcon color="warning" />}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap title={attachment.filename} sx={{ fontWeight: 500 }}>
          {attachment.filename}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {attachment.task_id} · {formatoTamano(attachment.size)}
          {attachment.uploaded_at ? ` · ${new Date(attachment.uploaded_at).toLocaleString()}` : ''}
        </Typography>
      </Box>

      {!servible && (
        <Chip size="small" color="warning" variant="outlined"
          label={t('instDetail.attachmentUnavailable')} />
      )}

      {servible && (
        <>
          <Tooltip title={t('instDetail.attachmentPreview')}>
            <IconButton size="small" onClick={() => onPreview(attachment)}
              aria-label={t('instDetail.attachmentPreview')}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('instDetail.attachmentDownload')}>
            <span>
              <IconButton size="small" onClick={descargar} disabled={descargando}
                aria-label={t('instDetail.attachmentDownload')}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
    </Paper>
  );
}
