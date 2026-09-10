import { Box, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { useTranslation } from 'react-i18next';
import AttachmentCard from '../AttachmentCard';
import { buscarAdjunto, esReferenciaS3, useRecursos, type ReferenciaS3 } from './recursos';

/**
 * Un archivo que vive dentro de un campo del formulario.
 *
 * Los archivos no salen solo del paso de subida: un formulario con un campo de
 * tipo archivo deja en el context la referencia al objeto guardado, y ahi es
 * donde el revisor la encuentra al leer «Documentos de Identidad». Se presenta
 * con la misma tarjeta que en la pestana de adjuntos, con lo que se puede ver y
 * descargar sin salir del paso.
 *
 * Cuando no hay adjunto que corresponda —el expediente de origen es de otra
 * instancia y sus archivos no se pueden pedir a esta— se enseña el nombre sin
 * acciones, que sigue siendo mejor que un volcado del objeto.
 */
export default function ArchivoDeCampo({ valor }: { valor: unknown }) {
  const { t } = useTranslation();
  const recursos = useRecursos();

  if (!esReferenciaS3(valor)) return null;
  const ref = valor as ReferenciaS3;

  const adjunto = recursos ? buscarAdjunto(recursos.attachments, ref) : null;
  if (adjunto && recursos) {
    return (
      <AttachmentCard
        instanceId={recursos.instanceId}
        attachment={adjunto}
        onPreview={recursos.previsualizar}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <DescriptionIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      <Typography variant="body2" noWrap title={ref.filename || ref.s3_key}>
        {ref.filename || ref.s3_key?.split('/').pop() || t('operador.archivo')}
      </Typography>
    </Box>
  );
}
