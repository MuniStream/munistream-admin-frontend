import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Download, PictureAsPdf } from '@mui/icons-material';

interface EntityViewerProps {
  entityId: string;
  entityName?: string;
  apiBaseUrl?: string;
}

export const EntityViewer: React.FC<EntityViewerProps> = ({
  entityId,
  entityName,
  apiBaseUrl = '/api/v1'
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${apiBaseUrl}/signatures/entities/${entityId}/html`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('No hay visualizador HTML disponible para esta entidad');
            return;
          }
          throw new Error('Error al cargar el HTML del documento');
        }

        const htmlData = await response.text();
        setHtmlContent(htmlData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadHtmlContent();
  }, [entityId, apiBaseUrl]);

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/signatures/entities/${entityId}/pdf`);
      if (!response.ok) {
        throw new Error('Error al descargar PDF');
      }

      const blob = await response.blob();
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
          backgroundColor: '#f5f5f5'
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