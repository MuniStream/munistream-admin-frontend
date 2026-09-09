import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { isBlobDescriptor, isRedacted, isTruncated } from '@/types/instanceDetail';
import type { DossierContext } from '@/types/instanceDetail';

interface Props {
  context: DossierContext;
}

function Valor({ value }: { value: unknown }) {
  const { t } = useTranslation();

  if (isRedacted(value)) {
    return <Chip size="small" color="warning" variant="outlined" label={t('instDetail.contextRedacted')} />;
  }
  if (isBlobDescriptor(value) || isTruncated(value)) {
    const size = (value as { size?: number }).size;
    return (
      <Chip size="small" variant="outlined"
        label={t('instDetail.contextTruncated', { size: size ? Math.round(size / 1024) : '?' })} />
    );
  }
  if (value === null || value === undefined || value === '') {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  if (typeof value === 'object') {
    return (
      <Box component="pre" sx={{
        m: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        color: 'text.secondary', maxHeight: 260, overflow: 'auto',
      }}>
        {JSON.stringify(value, null, 2)}
      </Box>
    );
  }
  return <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{String(value)}</Typography>;
}

function Campos({ data }: { data: Record<string, unknown> }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 30%) minmax(0, 1fr)', gap: 1 }}>
      {Object.entries(data).map(([k, v]) => (
        <Box key={k} sx={{ display: 'contents' }}>
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25, wordBreak: 'break-word' }}>
            {k}
          </Typography>
          <Valor value={v} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Contexto del trámite, agrupado por paso.
 *
 * Se agrupa en vez de volcarse plano porque lo que el revisor necesita saber es
 * qué aportó el ciudadano en cada paso, no qué claves tiene un diccionario.
 * Los secretos llegan ya redactados del backend; aquí solo se señalan.
 */
export default function InstanceContextPanel({ context }: Props) {
  const { t } = useTranslation();

  const tareas = Object.entries(context.by_task || {});
  const generales = context.general || {};

  if (tareas.length === 0 && Object.keys(generales).length === 0) {
    return <Typography variant="body2" color="text.secondary">{t('instDetail.contextEmpty')}</Typography>;
  }

  return (
    <Box>
      {tareas.map(([task, data]) => (
        <Accordion key={task} disableGutters defaultExpanded={tareas.length <= 3}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{task}</Typography>
            <Chip size="small" variant="outlined" sx={{ ml: 1, height: 20 }}
              label={Object.keys(data).length} />
          </AccordionSummary>
          <AccordionDetails>
            <Campos data={data} />
          </AccordionDetails>
        </Accordion>
      ))}

      {Object.keys(generales).length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>{t('instDetail.contextGeneral')}</Typography>
          <Campos data={generales} />
        </Paper>
      )}
    </Box>
  );
}
