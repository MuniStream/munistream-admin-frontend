import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import instanceDetailService from '@/services/instanceDetailService';

interface Props {
  instanceId: string;
  entityId: string;
  entityName: string;
  onExpand?: () => void;
  height?: number | string;
}

/**
 * Documento renderizado de una entidad.
 *
 * Es la misma representación que ve el ciudadano, generada con el visualizador
 * que la entidad declara. Para revisar hace falta ver el documento, no solo los
 * campos sueltos: el sello, la vigencia y la firma viven en la plantilla.
 *
 * El HTML se pide con el token de sesión y se pinta con `srcDoc`. Apuntar el
 * `src` del iframe al endpoint no funcionaría: un iframe no manda la cabecera
 * `Authorization`.
 */
export default function EntityDocumentView({
  instanceId, entityId, entityName, onExpand, height = 460,
}: Props) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [descargando, setDescargando] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['entity-document', instanceId, entityId],
    queryFn: () => instanceDetailService.getEntityDocumentHtml(instanceId, entityId),
    enabled: !!instanceId && !!entityId,
    staleTime: Infinity,
    retry: false,
  });

  // El iframe se recarga al cambiar de entidad; sin esto conservaría el
  // desplazamiento del documento anterior.
  useEffect(() => {
    if (iframeRef.current) iframeRef.current.scrollTop = 0;
  }, [entityId]);

  const imprimir = () => {
    // Por referencia y no por `document.querySelector('iframe')`: en esta
    // pantalla puede haber más de un iframe a la vez.
    iframeRef.current?.contentWindow?.print();
  };

  const descargarPdf = async () => {
    setDescargando(true);
    let url: string | null = null;
    try {
      const blob = await instanceDetailService.fetchEntityDocumentPdf(instanceId, entityId);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName || entityId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      if (url) URL.revokeObjectURL(url);
      setDescargando(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Una entidad sin visualizador configurado no es un error: simplemente no
  // tiene documento, y sus datos siguen visibles en la otra pestaña.
  if (error || !data) {
    return <Alert severity="info">{t('instDetail.entityNoDocument')}</Alert>;
  }

  return (
    <Box>
      <Box
        sx={{
          height,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'grey.100',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={data}
          title={t('instDetail.entityDocumentTitle', { name: entityName })}
          style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {onExpand && (
          <Tooltip title={t('instDetail.entityDocumentExpand')}>
            <Button size="small" startIcon={<OpenInFullIcon />} onClick={onExpand}>
              {t('instDetail.entityDocumentExpand')}
            </Button>
          </Tooltip>
        )}
        <Button size="small" startIcon={<PrintIcon />} onClick={imprimir}>
          {t('instDetail.print')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={descargarPdf}
          disabled={descargando}
        >
          {t('instDetail.downloadPdf')}
        </Button>
      </Box>
    </Box>
  );
}
