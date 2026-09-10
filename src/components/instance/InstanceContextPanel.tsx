import { useMemo, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { Campos, visualizadorDe } from './operadores';
import { RecursosProvider } from './operadores/recursos';
import AttachmentPreviewDialog from './AttachmentPreviewDialog';
import type { DossierAttachment, DossierContext } from '@/types/instanceDetail';

interface Props {
  context: Pick<DossierContext, 'by_task' | 'general' | 'operators'>;
  /**
   * La instancia a la que pertenece este expediente, y sus adjuntos.
   *
   * Van juntos y son opcionales por el mismo motivo: el expediente de origen es
   * de *otra* instancia, y sus archivos y entidades no se pueden pedir a esta.
   * Sin ellos los pasos siguen leyéndose; lo que no aparece es el documento.
   */
  instanceId?: string;
  attachments?: DossierAttachment[];
}

/** «UserInputOperator» → «User input»: legible sin ser jerga interna. */
function etiquetaDeOperador(operador: string): string {
  return operador
    .replace(/Operator$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * El expediente: qué ocurrió en cada paso del trámite.
 *
 * Se agrupa por paso y cada grupo se presenta según el operador que lo produjo,
 * porque un formulario, unos archivos y una firma no se leen igual. Antes todo
 * caía en pares clave/valor y lo estructurado acababa como JSON en pantalla.
 */
export default function InstanceContextPanel({ context, instanceId, attachments }: Props) {
  const { t } = useTranslation();
  const [previsualizando, setPrevisualizando] = useState<DossierAttachment | null>(null);

  const tareas = Object.entries(context.by_task || {});
  const generales = context.general || {};

  const recursos = useMemo(
    () =>
      instanceId
        ? { instanceId, attachments: attachments ?? [], previsualizar: setPrevisualizando }
        : null,
    [instanceId, attachments],
  );

  if (tareas.length === 0 && Object.keys(generales).length === 0) {
    return <Typography variant="body2" color="text.secondary">{t('instDetail.contextEmpty')}</Typography>;
  }

  const cuerpo = (
    <Box>
      {tareas.map(([task, data]) => {
        const meta = context.operators?.[task];
        const { nombre, Componente } = visualizadorDe(meta?.operator);

        return (
          <Accordion
            key={task}
            disableGutters
            defaultExpanded={tareas.length <= 4}
            data-task={task}
            data-operador={meta?.operator || ''}
            data-visualizador={nombre}
            // Un paso plegado no monta su visualizador. Importa desde que el
            // expediente ensena documentos y archivos: si no, abrir un tramite
            // dispara la descarga de todo lo que contiene antes de que nadie
            // haya pedido ver nada.
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
                <Typography variant="subtitle2" noWrap>
                  {meta?.name || task}
                </Typography>
                {meta?.operator && (
                  <Chip
                    size="small"
                    variant="outlined"
                    sx={{ height: 20 }}
                    label={etiquetaDeOperador(meta.operator)}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Componente campos={data} task={task} />
            </AccordionDetails>
          </Accordion>
        );
      })}

      {Object.keys(generales).length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>{t('instDetail.contextGeneral')}</Typography>
          <Campos campos={generales} task="" />
        </Paper>
      )}
    </Box>
  );

  if (!recursos) return cuerpo;

  return (
    <RecursosProvider value={recursos}>
      {cuerpo}
      <AttachmentPreviewDialog
        instanceId={recursos.instanceId}
        attachment={previsualizando}
        onClose={() => setPrevisualizando(null)}
      />
    </RecursosProvider>
  );
}
