import { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ESTADO, NEUTRAL } from '@/theme/tokens';

interface WorkflowDiagramProps {
  workflowData: any;
  instanceData?: any;
}

let renderCounter = 0;
let mermaidInitialized = false;

function generateMermaidDiagram(workflowData: any, instanceData?: any): string {
  let diagram = 'graph TD\n';
  const edges: string[] = [];

  workflowData.steps?.forEach((step: any) => {
    const stepId = step.step_id.replace(/[^a-zA-Z0-9]/g, '_');
    const stepName = step.name.replace(/"/g, "'").substring(0, 30);
    const stepType = step.step_type;

    let nodeStyle = '';
    switch (stepType) {
      case 'action': nodeStyle = 'actionNode'; break;
      case 'conditional': nodeStyle = 'conditionalNode'; break;
      case 'approval': nodeStyle = 'approvalNode'; break;
      case 'terminal': nodeStyle = 'terminalNode'; break;
      case 'integration': nodeStyle = 'integrationNode'; break;
      default: nodeStyle = 'defaultNode';
    }

    if (instanceData?.step_results?.[step.step_id]) {
      const stepResult = instanceData.step_results[step.step_id];
      switch (stepResult.status) {
        case 'completed': nodeStyle = 'completedNode'; break;
        case 'in_progress': nodeStyle = 'inProgressNode'; break;
        case 'failed': nodeStyle = 'failedNode'; break;
      }
    }

    if (stepType === 'conditional') {
      diagram += `  ${stepId}{"${stepName}"}\n`;
    } else if (stepType === 'terminal') {
      diagram += `  ${stepId}(("${stepName}"))\n`;
    } else {
      diagram += `  ${stepId}["${stepName}"]\n`;
    }

    diagram += `  class ${stepId} ${nodeStyle}\n`;

    if (step.next_steps?.length > 0) {
      step.next_steps.forEach((nextStepId: string) => {
        const nextId = nextStepId.replace(/[^a-zA-Z0-9]/g, '_');
        edges.push(`  ${stepId} --> ${nextId}`);
      });
    }
  });

  diagram += edges.join('\n') + '\n';

  // Los colores del diagrama salen del sistema, no de la paleta de Material:
  // antes eran veintisiete valores sueltos que un cambio de tema no alcanzaba,
  // así que el diagrama seguía siendo azul mientras el resto ya no lo era.
  diagram += `
  classDef actionNode fill:${ESTADO.info.soft},stroke:${ESTADO.info.main},stroke-width:2px,color:${NEUTRAL.text}
  classDef conditionalNode fill:${ESTADO.warning.soft},stroke:${ESTADO.warning.main},stroke-width:2px,color:${NEUTRAL.text}
  classDef approvalNode fill:${ESTADO.success.soft},stroke:${ESTADO.success.main},stroke-width:2px,color:${NEUTRAL.text}
  classDef terminalNode fill:${ESTADO.error.soft},stroke:${ESTADO.error.main},stroke-width:2px,color:${NEUTRAL.text}
  classDef integrationNode fill:${ESTADO.neutral.soft},stroke:${ESTADO.neutral.main},stroke-width:2px,color:${NEUTRAL.text}
  classDef defaultNode fill:${NEUTRAL.sunken},stroke:${NEUTRAL.borderStrong},stroke-width:2px,color:${NEUTRAL.text}
  classDef completedNode fill:${ESTADO.success.soft},stroke:${ESTADO.success.main},stroke-width:3px,color:${NEUTRAL.text}
  classDef inProgressNode fill:${ESTADO.warning.soft},stroke:${ESTADO.warning.main},stroke-width:3px,color:${NEUTRAL.text}
  classDef failedNode fill:${ESTADO.error.soft},stroke:${ESTADO.error.main},stroke-width:3px,color:${NEUTRAL.text}
`;

  return diagram;
}

function WorkflowDiagram({ workflowData, instanceData }: WorkflowDiagramProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !workflowData?.steps?.length) return;

    let cancelled = false;

    const render = async () => {
      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
            securityLevel: 'loose',
          });
          mermaidInitialized = true;
        }

        const diagramDef = generateMermaidDiagram(workflowData, instanceData);
        const id = `mermaid-diagram-${++renderCounter}`;
        const { svg } = await mermaid.render(id, diagramDef);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.display = 'block';
            svgEl.style.margin = '0 auto';
          }
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('wfDiagram.renderError'));
        }
      }
    };

    render();
    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [workflowData, instanceData]);

  if (!workflowData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>{t('wfDiagram.noData')}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Diagrama del Flujo: {workflowData.name}
      </Typography>
      {error ? (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <Box
          ref={containerRef}
          sx={{
            minHeight: 300,
            width: '100%',
            overflow: 'auto',
            p: 2,
            '& svg': { maxWidth: '100%', height: 'auto' },
          }}
        />
      )}
      {instanceData && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Completado | En Progreso | Fallido | Pendiente
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default WorkflowDiagram;
