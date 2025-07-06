import { useEffect, useRef } from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';

interface WorkflowDiagramProps {
  workflowData: any;
  instanceData?: any;
}

function WorkflowDiagram({ workflowData, instanceData }: WorkflowDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mermaidRef.current && workflowData) {
      // Generate Mermaid diagram from workflow data
      const generateMermaidDiagram = () => {
        let diagram = 'graph TD\n';
        
        // Add nodes
        workflowData.steps?.forEach((step: any) => {
          const stepId = step.step_id.replace(/[^a-zA-Z0-9]/g, '_');
          const stepName = step.name.replace(/[^\w\s]/g, '').substring(0, 20); // Shorter names
          const stepType = step.step_type;
          
          // Style based on step type (backend uses lowercase)
          let nodeStyle = '';
          
          switch (stepType) {
            case 'action':
              nodeStyle = 'actionNode';
              break;
            case 'conditional':
              nodeStyle = 'conditionalNode';
              break;
            case 'approval':
              nodeStyle = 'approvalNode';
              break;
            case 'terminal':
              nodeStyle = 'terminalNode';
              break;
            case 'integration':
              nodeStyle = 'integrationNode';
              break;
            default:
              nodeStyle = 'defaultNode';
          }
          
          // If we have instance data, color based on step status
          if (instanceData?.step_results?.[step.step_id]) {
            const stepResult = instanceData.step_results[step.step_id];
            switch (stepResult.status) {
              case 'completed':
                nodeStyle = 'completedNode';
                break;
              case 'in_progress':
                nodeStyle = 'inProgressNode';
                break;
              case 'failed':
                nodeStyle = 'failedNode';
                break;
            }
          }
          
          // Generate node with proper Mermaid syntax
          if (stepType === 'conditional') {
            diagram += `  ${stepId}{${stepName}}\n`;
          } else if (stepType === 'terminal') {
            diagram += `  ${stepId}((${stepName}))\n`;
          } else {
            diagram += `  ${stepId}[${stepName}]\n`;
          }
          
          // Add CSS class for styling
          diagram += `  class ${stepId} ${nodeStyle}\n`;
        });
        
        // Add edges (connections between steps)
        workflowData.steps?.forEach((step: any) => {
          const stepId = step.step_id.replace(/[^a-zA-Z0-9]/g, '_');
          
          if (step.next_steps && step.next_steps.length > 0) {
            step.next_steps.forEach((nextStepId: string) => {
              const nextId = nextStepId.replace(/[^a-zA-Z0-9]/g, '_');
              diagram += `  ${stepId} --> ${nextId}\n`;
            });
          }
        });
        
        // Add CSS styling for different node types
        diagram += `
          classDef actionNode fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
          classDef conditionalNode fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
          classDef approvalNode fill:#e8f5e8,stroke:#4caf50,stroke-width:2px,color:#000
          classDef terminalNode fill:#ffebee,stroke:#f44336,stroke-width:2px,color:#000
          classDef integrationNode fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#000
          classDef defaultNode fill:#f5f5f5,stroke:#757575,stroke-width:2px,color:#000
          classDef completedNode fill:#c8e6c9,stroke:#4caf50,stroke-width:3px,color:#000
          classDef inProgressNode fill:#fff9c4,stroke:#ff9800,stroke-width:3px,color:#000
          classDef failedNode fill:#ffcdd2,stroke:#f44336,stroke-width:3px,color:#000
        `;
        
        return diagram;
      };

      const renderDiagram = async () => {
        try {
          // Try multiple import approaches
          let mermaid;
          try {
            mermaid = (await import('mermaid')).default;
          } catch (importError) {
            console.log('Default import failed, trying named import:', importError);
            const mermaidModule = await import('mermaid');
            mermaid = mermaidModule.default || mermaidModule;
          }

          if (!mermaid) {
            throw new Error('Mermaid module could not be loaded');
          }
          
          // Initialize mermaid
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis',
            },
            securityLevel: 'loose',
          });

          const diagramDefinition = generateMermaidDiagram();
          console.log('Generated Mermaid diagram:', diagramDefinition);
          
          // Clear previous diagram and work directly with the ref
          if (mermaidRef.current) {
            // Debug the container itself
            console.log('Container ref dimensions:', mermaidRef.current.getBoundingClientRect());
            console.log('Container ref parent:', mermaidRef.current.parentElement?.getBoundingClientRect());
            
            // Clear and style the container directly  
            mermaidRef.current.innerHTML = '';
            mermaidRef.current.style.width = '100%';
            mermaidRef.current.style.minHeight = '500px';
            mermaidRef.current.style.backgroundColor = '#fafafa';
            mermaidRef.current.style.border = '1px solid #e0e0e0';
            mermaidRef.current.style.borderRadius = '8px';
            mermaidRef.current.style.padding = '20px';
            mermaidRef.current.style.display = 'block';
            mermaidRef.current.style.visibility = 'visible';
            mermaidRef.current.style.textAlign = 'center';
            
            console.log('Container ref after styling:', mermaidRef.current.getBoundingClientRect());
            
            // Generate unique ID
            const elementId = `mermaid-${Date.now()}`;
            
            // Create element and append to the styled container
            const element = document.createElement('div');
            element.id = elementId;
            element.className = 'mermaid-diagram';
            element.textContent = diagramDefinition;
            mermaidRef.current.appendChild(element);
            
            // Ensure DOM is updated before rendering
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Try multiple rendering approaches
            try {
              // Try render method first (better for newer versions)
              if (mermaid.render) {
                console.log('Using mermaid.render method');
                const { svg } = await mermaid.render(elementId, diagramDefinition);
                console.log('Render successful, SVG length:', svg.length);
                
                // Insert SVG directly into the main container
                mermaidRef.current.innerHTML = svg;
                
                // Wait for DOM update then style SVG
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const svgElement = mermaidRef.current.querySelector('svg');
                if (svgElement) {
                  // Style the SVG for proper responsive display
                  svgElement.style.cssText = 'width: 100% !important; height: auto !important; max-width: 1000px !important; display: block !important; margin: 0 auto !important; background: white !important; border-radius: 4px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;';
                  
                  console.log('SVG styled successfully');
                } else {
                  console.log('No SVG found in main container');
                }
                
                console.log('Element made visible with debug styling');
              } else {
                // Fallback to init method
                console.log('Using mermaid.init method');
                await mermaid.init(undefined, element);
                element.style.visibility = 'visible';
                console.log('Init successful, element made visible');
              }
            } catch (renderError) {
              console.log('Render method failed, trying init:', renderError);
              try {
                // Last resort: try init with delay
                console.log('Trying init with delay...');
                await new Promise(resolve => setTimeout(resolve, 100));
                await mermaid.init(undefined, element);
                element.style.visibility = 'visible';
                console.log('Delayed init successful');
              } catch (initError) {
                console.error('Both render methods failed:', initError);
                throw initError;
              }
            }
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Error rendering workflow diagram</div>';
          }
        }
      };

      renderDiagram();
    }
  }, [workflowData, instanceData]);

  if (!workflowData) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No workflow data available</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workflow Diagram: {workflowData.name}
      </Typography>
      <Box 
        ref={mermaidRef}
        sx={{
          minHeight: '400px',
          width: '100%',
          overflow: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          p: 2,
          '& .mermaid': {
            display: 'block',
            width: '100%',
            textAlign: 'center',
          },
          '& svg': {
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
          },
        }}
      />
      {instanceData && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            🟢 Completed • 🟡 In Progress • 🔴 Failed • ⚪ Pending
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default WorkflowDiagram;