import { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import AttachmentCard from './AttachmentCard';
import AttachmentPreviewDialog from './AttachmentPreviewDialog';
import instanceDetailService from '@/services/instanceDetailService';
import type { DossierAttachment } from '@/types/instanceDetail';

interface Props {
  instanceId: string;
  attachments: DossierAttachment[];
  /** Para refrescar el expediente cuando se archiva algo nuevo. */
  onUploaded?: () => void;
}

export default function InstanceAttachmentsPanel({ instanceId, attachments, onUploaded }: Props) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DossierAttachment | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  /**
   * Archivar un documento que llegó por fuera: un oficio de otra dependencia, el
   * acuse de una notificación, una constancia que el ciudadano trajo en papel.
   * Antes no había dónde ponerlo —de los adjuntos solo se podía leer— así que se
   * quedaba en el correo del revisor y el expediente mentía por omisión.
   */
  const archivar = async (file: File) => {
    setSubiendo(true);
    setError(null);
    try {
      await instanceDetailService.uploadAttachment(instanceId, file);
      onUploaded?.();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'No se pudo archivar el documento.');
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  };

  const zonaDeSubida = (
    <Box sx={{ mb: attachments.length ? 2 : 0 }}>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) archivar(f); }}
      />
      <Button
        variant="outlined"
        size="small"
        startIcon={subiendo ? <CircularProgress size={16} /> : <UploadFileIcon />}
        disabled={subiendo}
        onClick={() => input.current?.click()}
      >
        {subiendo ? 'Archivando…' : 'Archivar documento'}
      </Button>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );

  if (attachments.length === 0) {
    return (
      <>
        {zonaDeSubida}
        <Typography variant="body2" color="text.secondary">{t('instDetail.attachmentsEmpty')}</Typography>
      </>
    );
  }

  return (
    <>
      {zonaDeSubida}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {attachments.map((a) => (
          <AttachmentCard
            key={a.attachment_id}
            instanceId={instanceId}
            attachment={a}
            onPreview={setPreview}
          />
        ))}
      </Box>

      <AttachmentPreviewDialog
        instanceId={instanceId}
        attachment={preview}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
