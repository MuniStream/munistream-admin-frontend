import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AttachmentCard from './AttachmentCard';
import AttachmentPreviewDialog from './AttachmentPreviewDialog';
import type { DossierAttachment } from '@/types/instanceDetail';

interface Props {
  instanceId: string;
  attachments: DossierAttachment[];
}

export default function InstanceAttachmentsPanel({ instanceId, attachments }: Props) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DossierAttachment | null>(null);

  if (attachments.length === 0) {
    return <Typography variant="body2" color="text.secondary">{t('instDetail.attachmentsEmpty')}</Typography>;
  }

  return (
    <>
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
