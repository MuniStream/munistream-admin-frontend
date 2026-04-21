import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useI18n } from '../contexts/I18nContext';

export interface AssertionResult {
  id: string;
  label: string;
  description?: string;
  left_value: any;
  right_value: any;
  left_path: string;
  right_path: string;
  operator: string;
  system_result: boolean;
  critical?: boolean;
}

interface AdminAssertionReviewProps {
  title: string;
  description: string;
  assertions: AssertionResult[];
  onSubmit: (data: Record<string, any>) => void;
  loading?: boolean;
  error?: string | null;
}

type UserDecision = 'confirm' | 'override';

interface DecisionState {
  decision: UserDecision;
  comment: string;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatOperator(op: string): string {
  const labels: Record<string, string> = {
    '==': '==',
    '!=': '!=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
    'contains': 'contiene',
    'not_contains': 'no contiene',
    'startswith': 'empieza con',
    'endswith': 'termina con',
    'matches': 'regex',
  };
  return labels[op] ?? op;
}

export const AdminAssertionReview: React.FC<AdminAssertionReviewProps> = ({
  title,
  description,
  assertions,
  onSubmit,
  loading = false,
  error,
}) => {
  const { t } = useI18n();
  const initialDecisions: Record<string, DecisionState> = {};
  assertions.forEach((a) => {
    initialDecisions[a.id] = {
      decision: a.system_result ? 'confirm' : 'override',
      comment: '',
    };
  });

  const [decisions, setDecisions] = useState<Record<string, DecisionState>>(initialDecisions);

  const setDecision = (id: string, decision: UserDecision) => {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], decision } }));
  };

  const setComment = (id: string, comment: string) => {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], comment } }));
  };

  const handleSubmit = () => {
    onSubmit({ decisions });
  };

  const passedCount = assertions.filter((a) => a.system_result).length;
  const overrideCount = Object.values(decisions).filter((d) => d.decision === 'override').length;

  const hasCriticalBlocked = assertions.some(
    (a) => a.critical && !a.system_result && decisions[a.id]?.decision === 'override'
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {description}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label={`${passedCount} de ${assertions.length} correctas`}
          color="success"
          size="small"
          variant="outlined"
        />
        {overrideCount > 0 && (
          <Chip
            icon={<WarningAmberIcon />}
            label={`${overrideCount} sobreescrita${overrideCount !== 1 ? 's' : ''}`}
            color="warning"
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      <Stack spacing={2} sx={{ mb: 3 }}>
        {assertions.map((assertion) => {
          const decisionState = decisions[assertion.id];
          const isOverride = decisionState?.decision === 'override';
          const isCriticalFail = assertion.critical && !assertion.system_result;

          return (
            <Paper
              key={assertion.id}
              variant="outlined"
              sx={{
                p: 2,
                borderLeft: 4,
                borderLeftColor: assertion.system_result
                  ? 'success.main'
                  : isCriticalFail
                  ? 'error.dark'
                  : 'error.main',
                bgcolor: assertion.system_result ? 'success.50' : 'error.50',
              }}
            >
              {/* Header row */}
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip
                  icon={assertion.system_result ? <CheckCircleIcon /> : <CancelIcon />}
                  label={assertion.system_result ? 'Correcto' : 'Incorrecto'}
                  color={assertion.system_result ? 'success' : 'error'}
                  size="small"
                />
                <Typography variant="subtitle2" component="span">
                  {assertion.label}
                </Typography>
                {isCriticalFail && (
                  <Chip
                    icon={<WarningAmberIcon />}
                    label={t('critical')}
                    color="warning"
                    size="small"
                  />
                )}
              </Stack>

              {assertion.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {assertion.description}
                </Typography>
              )}

              {/* Values row */}
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block">
                    Valor capturado
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'background.paper',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {formatValue(assertion.left_value)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ pt: 1.5 }}>
                  {formatOperator(assertion.operator)}
                </Typography>
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block">
                    Valor del sistema
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'background.paper',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {formatValue(assertion.right_value)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              {/* Decision */}
              {isCriticalFail ? (
                <Alert severity="error" sx={{ py: 0.5 }}>
                  Esta aserción es crítica y no puede sobreescribirse.
                </Alert>
              ) : (
                <Box>
                  <RadioGroup
                    row
                    value={decisionState?.decision ?? 'confirm'}
                    onChange={(e) => setDecision(assertion.id, e.target.value as UserDecision)}
                  >
                    <FormControlLabel
                      value="confirm"
                      control={<Radio size="small" color="success" />}
                      label={t('confirm')}
                      disabled={loading}
                    />
                    <FormControlLabel
                      value="override"
                      control={<Radio size="small" color="warning" />}
                      label={t('override')}
                      disabled={loading}
                    />
                  </RadioGroup>

                  {isOverride && (
                    <TextField
                      multiline
                      rows={2}
                      fullWidth
                      size="small"
                      placeholder="Comentario (opcional): explique por qué sobreescribe este resultado..."
                      value={decisionState?.comment ?? ''}
                      onChange={(e) => setComment(assertion.id, e.target.value)}
                      disabled={loading}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      {hasCriticalBlocked && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Hay aserciones críticas que fallaron. No es posible continuar el proceso.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading || hasCriticalBlocked}
        >
          {loading ? 'Enviando...' : 'Confirmar y Continuar'}
        </Button>
      </Box>
    </Box>
  );
};
