import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import {
  Download as DownloadIcon,
  Image as ImageIcon,
  CenterFocusStrong as FitIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import { NEUTRAL } from '@/theme/tokens';
import { downloadBlob, svgToPngBlob, workflowToBpmnXml } from '@/utils/bpmnExport';

interface BpmnViewerProps {
  workflowData: any;
}

function BpmnViewer({ workflowData }: BpmnViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !workflowData?.steps?.length) return;

    let cancelled = false;
    let viewer: any = null;

    const render = async () => {
      try {
        const { default: NavigatedViewer } = await import('bpmn-js/lib/NavigatedViewer');
        if (cancelled || !containerRef.current) return;
        viewer = new NavigatedViewer({ container: containerRef.current });
        viewerRef.current = viewer;
        await viewer.importXML(workflowToBpmnXml(workflowData));
        if (!cancelled) {
          viewer.get('canvas').zoom('fit-viewport');
          setError(null);
        }
      } catch (err) {
        console.error('Error rendering BPMN:', err);
        if (!cancelled) setError(t('wfDiagram.renderError'));
      }
    };

    render();
    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [workflowData]);

  const filename = workflowData?.workflow_id || 'tramite';

  const handleDownloadXml = async () => {
    try {
      const { xml } = await viewerRef.current.saveXML({ format: true });
      downloadBlob(new Blob([xml], { type: 'application/xml' }), `${filename}.bpmn`);
    } catch (err) {
      console.error('Error exporting BPMN:', err);
      setError(t('bpmn.exportError'));
    }
  };

  const handleDownloadPng = async () => {
    try {
      const { svg } = await viewerRef.current.saveSVG();
      downloadBlob(await svgToPngBlob(svg), `${filename}.png`);
    } catch (err) {
      console.error('Error exporting PNG:', err);
      setError(t('bpmn.exportError'));
    }
  };

  if (!workflowData?.steps?.length) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>{t('wfDiagram.noData')}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Typography variant="h6">BPMN: {workflowData.name}</Typography>
        <Stack direction="row" gap={1}>
          <Button size="small" startIcon={<FitIcon />} onClick={() => viewerRef.current?.get('canvas').zoom('fit-viewport')}>
            {t('bpmn.fit')}
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadXml}>
            {t('bpmn.downloadXml')}
          </Button>
          <Button size="small" variant="outlined" startIcon={<ImageIcon />} onClick={handleDownloadPng}>
            {t('bpmn.downloadPng')}
          </Button>
        </Stack>
      </Stack>
      {error && (
        <Typography color="error" variant="body2" mb={1}>
          {error}
        </Typography>
      )}
      <Box
        ref={containerRef}
        sx={{
          height: 600,
          width: '100%',
          border: `1px solid ${NEUTRAL.borderStrong}`,
          borderRadius: 1,
          bgcolor: '#fff',
          overflow: 'hidden',
        }}
      />
    </Paper>
  );
}

export default BpmnViewer;
