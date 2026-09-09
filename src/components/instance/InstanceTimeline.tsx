import {
  Box, Chip, LinearProgress, Step, StepContent, StepLabel, Stepper, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface Props {
  progress: any;
}

const COLOR: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  completed: 'success',
  failed: 'error',
  running: 'info',
  waiting: 'warning',
  paused: 'warning',
};

/** Avance del trámite paso a paso. */
export default function InstanceTimeline({ progress }: Props) {
  const { t } = useTranslation();

  const pasos = progress?.step_progress || [];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t('wfExec.stepsCompleted', {
              completed: progress?.completed_steps ?? 0,
              total: progress?.total_steps ?? 0,
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress?.progress_percentage ?? 0)}%
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress?.progress_percentage ?? 0} />
      </Box>

      <Stepper orientation="vertical">
        {pasos.map((step: any) => (
          <Step key={step.step_id} active completed={step.status === 'completed'}>
            <StepLabel error={step.status === 'failed'}>
              <Typography variant="subtitle2">{step.name}</Typography>
            </StepLabel>
            <StepContent>
              {step.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {step.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" label={step.status} color={COLOR[step.status] || 'default'} />
                {step.started_at && (
                  <Typography variant="caption" color="text.secondary">
                    {t('wfExec.startedAt', { date: new Date(step.started_at).toLocaleString() })}
                  </Typography>
                )}
                {step.completed_at && (
                  <Typography variant="caption" color="text.secondary">
                    {t('wfExec.completedAt', { date: new Date(step.completed_at).toLocaleString() })}
                  </Typography>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
