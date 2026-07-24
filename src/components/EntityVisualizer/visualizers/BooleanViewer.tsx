import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Chip, Switch, FormControlLabel } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import type { DetectedField } from '../../../utils/entityFieldDetector';

interface BooleanViewerProps {
  entity: any;
  fieldName: string;
  fieldValue: boolean;
  detectedField: DetectedField;
  options?: Record<string, any>;
}

export const BooleanViewer: React.FC<BooleanViewerProps> = ({
  fieldValue,
  options = {}
}) => {
  const { t } = useTranslation();
  const displayStyle = options.style || 'chip'; // 'chip', 'switch', 'icon'

  switch (displayStyle) {
    case 'switch':
      return (
        <FormControlLabel
          control={<Switch checked={fieldValue} disabled />}
          label={fieldValue ? t('entViz.yes') : t('entViz.no')}
        />
      );

    case 'icon':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {fieldValue ? (
            <CheckCircle color="success" />
          ) : (
            <Cancel color="error" />
          )}
          <span>{fieldValue ? t('entViz.yes') : t('entViz.no')}</span>
        </Box>
      );

    default: // chip
      return (
        <Chip
          label={fieldValue ? t('entViz.yes') : t('entViz.no')}
          color={fieldValue ? 'success' : 'default'}
          variant="outlined"
          size="small"
          icon={fieldValue ? <CheckCircle /> : <Cancel />}
        />
      );
  }
};