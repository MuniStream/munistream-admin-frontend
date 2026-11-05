import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Download, PictureAsPdf } from '@mui/icons-material';
import axios from 'axios';
import { NEUTRAL } from '@/theme/tokens';
import instanceDetailService from '../services/instanceDetailService';

interface EntityViewerProps {
  /** Instance whose citizen owns the entity: the document hangs from it so the
   *  request carries the session token and the access policy applies. */
  instanceId: string;
  entityId: string;
  entityName?: string;
}

export const EntityViewer: React.FC<EntityViewerProps> = ({
  instanceId,
  entityId,
  entityName,
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        setLoading(true);
        setError(null);

        setHtmlContent(await instanceDetailService.getEntityDocumentHtml(instanceId, entityId));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('No hay visualizador HTML disponible para esta entidad');
          return;
        }
        setError('Error al cargar el HTML del documento');
      } finally {
        setLoading(false);
      }
    };

    loadHtmlContent();
  }, [instanceId, entityId]);

  const handleDownloadPdf = async () => {
    try {
      const blob = await instanceDetailService.fetchEntityDocumentPdf(instanceId, entityId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entityName || entityId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Cargando documento...
        </Typography>
      </Box>
    );
  }

  if (error || !htmlContent) {
    return (
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2">
          {error || 'No hay visualizador disponible para esta entidad.'}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Button
            startIcon={<Download />}
            onClick={handleDownloadPdf}
            size="small"
            variant="outlined"
          >
            Descargar PDF
          </Button>
        </Box>
      </Alert>
    );
  }

  return (
    <Box>
      {/* HTML Iframe */}
      <Box
        sx={{
          width: '100%',
          height: '600px',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 1,
          backgroundColor: `${NEUTRAL.sunken}`
        }}
      >
        <iframe
          srcDoc={htmlContent}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white'
          }}
          title={`Documento - ${entityName || entityId}`}
        />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          startIcon={<PictureAsPdf />}
          onClick={() => {
            const iframe = document.querySelector('iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.print();
            }
          }}
          size="small"
          variant="outlined"
        >
          Imprimir
        </Button>
        <Button
          startIcon={<Download />}
          onClick={handleDownloadPdf}
          size="small"
          variant="contained"
        >
          Descargar PDF
        </Button>
      </Box>
    </Box>
  );
};