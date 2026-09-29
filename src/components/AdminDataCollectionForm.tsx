import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Alert,
  Paper,
  Checkbox,
  FormControlLabel,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { getCustomFieldRenderer } from './customFieldRegistry';

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Tipos que el admin renderiza como campo editable. Cualquier otro (un widget
// propio de un paso del ciudadano) se muestra en solo lectura.
const EDITABLE_FIELD_TYPES = new Set<string>([
  'text', 'email', 'phone', 'tel', 'url', 'password',
  'date', 'time', 'datetime-local', 'number',
  'select', 'textarea', 'file', 'entity_select', 'entity_multi_select',
]);

// Visor recursivo de solo lectura para datos estructurados (listas y objetos
// anidados, p. ej. facturas con sus conceptos). No conoce ningún esquema de
// trámite: aplana claves y valores de forma legible en vez de un volcado JSON.
const ReadOnlyValue: React.FC<{ value: any; nivel?: number }> = ({ value, nivel = 0 }) => {
  if (value === null || value === undefined || value === '') {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  if (typeof value !== 'object') {
    return <Typography variant="body2">{String(value)}</Typography>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Typography variant="body2" color="text.secondary">—</Typography>;
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {value.map((item, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1 }}>
            <ReadOnlyValue value={item} nivel={nivel + 1} />
          </Paper>
        ))}
      </Box>
    );
  }
  // Objeto: par clave/valor, saltando internos y binarios ruidosos.
  const entradas = Object.entries(value).filter(
    ([k]) => !k.startsWith('_') && !['base64', 'content'].includes(k)
  );
  if (entradas.length === 0) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 12rem) 1fr', columnGap: 2, rowGap: 0.5 }}>
      {entradas.map(([k, v]) => (
        <React.Fragment key={k}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, alignSelf: 'start' }}>
            {k}
          </Typography>
          <Box><ReadOnlyValue value={v} nivel={nivel + 1} /></Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

export interface AdminFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select' | 'textarea' | 'file' | 'entity_select' | 'entity_multi_select';
  required: boolean;
  placeholder?: string;
  options?: string[] | EntityOption[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  helpText?: string;
  entity_type?: string;
  min_count?: number;
  max_count?: number;
  description?: string;
}

export interface EntityOption {
  value: string;
  label: string;
  entity_data: {
    entity_id: string;
    entity_type: string;
    name: string;
    data: Record<string, any>;
  };
}

export interface AdminFormSection {
  title: string;
  description?: string;
  fields: AdminFormField[];
  entityType?: string;
}

export interface AdminDataCollectionFormProps {
  title: string;
  description: string;
  fields?: AdminFormField[];
  sections?: AdminFormSection[];
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export const AdminDataCollectionForm: React.FC<AdminDataCollectionFormProps> = ({
  title,
  description,
  fields,
  sections,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  // Get all fields either from sections or direct fields prop
  const allFields = React.useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.flatMap(section => section.fields);
    }
    return fields || [];
  }, [fields, sections]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleFileUpload = (fieldId: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
      setFormData(prev => ({ ...prev, [fieldId]: file.name }));

      // Clear error
      if (errors[fieldId]) {
        setErrors(prev => ({ ...prev, [fieldId]: '' }));
      }
    }
  };

  const validateField = (field: AdminFormField, value: any): string => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return t('dataForm.required', { label: field.label });
    }

    if (value && field.validation) {
      const { pattern, minLength, maxLength, min, max } = field.validation;

      if (pattern && !new RegExp(pattern).test(value)) {
        return t('dataForm.formatInvalid', { label: field.label });
      }

      if (minLength && value.length < minLength) {
        return t('dataForm.minLength', { label: field.label, count: minLength });
      }

      if (maxLength && value.length > maxLength) {
        return t('dataForm.maxLength', { label: field.label, count: maxLength });
      }

      if (field.type === 'number') {
        const numValue = parseFloat(value);
        if (min !== undefined && numValue < min) {
          return t('dataForm.minValue', { label: field.label, min });
        }
        if (max !== undefined && numValue > max) {
          return t('dataForm.maxValue', { label: field.label, max });
        }
      }
    }

    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    allFields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare submission data including files
    const submissionData = {
      ...formData,
      _files: uploadedFiles
    };

    onSubmit(submissionData);
  };

  // Entity Card Component for entity selection fields
  const EntityCard: React.FC<{ entity: EntityOption; isSelected: boolean; onToggle: () => void }> = ({
    entity,
    isSelected,
    onToggle
  }) => {
    const entityData = entity.entity_data;

    return (
      <Paper
        onClick={onToggle}
        sx={{
          p: 2,
          mb: 1,
          border: 2,
          borderColor: isSelected ? 'primary.main' : 'divider',
          backgroundColor: isSelected ? 'action.selected' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Checkbox
            checked={isSelected}
            onChange={() => {}} // Handled by card click
            sx={{ pointerEvents: 'none' }}
          />
          <Box flex={1}>
            <Typography variant="subtitle1" color="primary.main" fontWeight="bold">
              {entityData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dataForm.type', { value: entityData.entity_type })}
            </Typography>
            {entityData.data.document_type && (
              <Typography variant="caption" color="text.secondary">
                {t('dataForm.document', { value: entityData.data.document_type })}
              </Typography>
            )}
            {entityData.data.upload_date && (
              <Typography variant="caption" color="text.secondary" display="block">
                {t('dataForm.uploaded', { date: new Date(entityData.data.upload_date).toLocaleDateString() })}
              </Typography>
            )}
            {entityData.data.file_size && (
              <Typography variant="caption" color="text.secondary" display="block">
                {t('dataForm.sizeKb', { size: Math.round(entityData.data.file_size / 1024) })}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderField = (field: AdminFormField) => {
    const hasError = !!errors[field.id];

    // Renderer propio del tenant para este tipo de campo (lo registra un override
    // desde su carpeta al arrancar). Así un operador custom despliega su propia UI
    // de administración sin que el admin base conozca el tipo. Por defecto en modo
    // de revisión (readOnly): el personal valida lo capturado por el ciudadano.
    const customRenderer = getCustomFieldRenderer(field.type as string);
    if (customRenderer) {
      const rendered = customRenderer({
        field,
        value: formData[field.id],
        onChange: (v: any) => handleInputChange(field.id, v),
        readOnly: true,
        disabled: isSubmitting,
      });
      if (rendered !== undefined && rendered !== null) return rendered;
    }

    // Tipos de campo que el admin no sabe (ni debe) editar —los pasos de captura
    // del ciudadano con widgets propios—. Antes caían al `default` y se pintaban
    // como un <input> suelto con `type="<lo-que-sea>"`. Aquí se muestran en solo
    // lectura, con su dato estructurado legible. Genérico: sin conocer trámites.
    if (!EDITABLE_FIELD_TYPES.has(field.type as string)) {
      const datosCampo = (field as any).facturas ?? formData[field.id] ?? (field as any).value;
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{field.label}</Typography>
          {field.helpText && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {field.helpText}
            </Typography>
          )}
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <ReadOnlyValue value={datosCampo} />
          </Paper>
        </Box>
      );
    }

    switch (field.type) {
      case 'entity_select':
      case 'entity_multi_select': {
        const entityOptions = field.options as EntityOption[] || [];
        const isMultiSelect = field.type === 'entity_multi_select';
        const currentValue = formData[field.id] || (isMultiSelect ? [] : '');
        const selectedValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);

        const handleEntityToggle = (entityId: string) => {
          if (isMultiSelect) {
            const newValues = selectedValues.includes(entityId)
              ? selectedValues.filter(id => id !== entityId)
              : [...selectedValues, entityId];
            handleInputChange(field.id, newValues);
          } else {
            handleInputChange(field.id, selectedValues.includes(entityId) ? '' : entityId);
          }
        };

        return (
          <Box>
            {field.description && (
              <Typography variant="body2" color="text.secondary" paragraph>
                {field.description}
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isMultiSelect
                ? t('dataForm.selectedCount', { count: selectedValues.length, max: field.max_count || t('dataForm.unlimited') })
                : t('dataForm.selectedCount', { count: selectedValues.length > 0 ? 1 : 0, max: 1 })
              }
              {field.min_count && field.min_count > 0 && (
                <span style={{ color: 'red', marginLeft: 8 }}>
                  {t('dataForm.minimum', { count: field.min_count })}
                </span>
              )}
            </Typography>

            {entityOptions.length === 0 ? (
              <Alert severity="info" sx={{ my: 2 }}>
                <Typography variant="subtitle2">
                  {t('dataForm.noEntities', { type: field.entity_type })}
                </Typography>
                <Typography variant="body2">
                  {t('dataForm.uploadFirst', { type: field.entity_type })}
                </Typography>
              </Alert>
            ) : (
              entityOptions.map((entity) => (
                <EntityCard
                  key={entity.value}
                  entity={entity}
                  isSelected={selectedValues.includes(entity.value)}
                  onToggle={() => handleEntityToggle(entity.value)}
                />
              ))
            )}
          </Box>
        );
      }

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            id={field.id}
            name={field.id}
            label={field.label}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
            error={hasError}
            helperText={hasError ? errors[field.id] : field.helpText}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth error={hasError}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              id={field.id}
              name={field.id}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              label={field.label}
              required={field.required}
              disabled={isSubmitting}
            >
              {field.options?.map(option => {
                const isEntityOption = typeof option === 'object' && 'value' in option;
                const key = isEntityOption ? option.value : option;
                const value = isEntityOption ? option.value : option;
                const label = isEntityOption ? option.label : option;
                return (
                  <MenuItem key={key} value={value}>{label}</MenuItem>
                );
              })}
            </Select>
            {(hasError || field.helpText) && (
              <FormHelperText>{hasError ? errors[field.id] : field.helpText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'file':
        return (
          <Box>
            <input
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: 'none' }}
              id={`file-upload-${field.id}`}
              type="file"
              onChange={(e) => handleFileUpload(field.id, e.target.files)}
              disabled={isSubmitting}
            />
            <label htmlFor={`file-upload-${field.id}`}>
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                disabled={isSubmitting}
                fullWidth
                sx={{ mb: 1 }}
              >
                {t('dataForm.upload', { label: field.label })}
              </Button>
            </label>

            {uploadedFiles[field.id] ? (
              <Paper sx={{ p: 2, backgroundColor: 'success.light' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckIcon color="success" />
                    <Typography variant="body2">
                      {uploadedFiles[field.id].name}
                    </Typography>
                    <Chip
                      label={`${Math.round(uploadedFiles[field.id].size / 1024)} KB`}
                      size="small"
                      color="success"
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newFiles = { ...uploadedFiles };
                      delete newFiles[field.id];
                      setUploadedFiles(newFiles);
                      setFormData(prev => ({ ...prev, [field.id]: '' }));
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ) : (
              <Typography variant="caption" color="text.secondary" display="block">
                {t('dataForm.supportedFormats')}
              </Typography>
            )}

            {hasError && (
              <FormHelperText error>{errors[field.id]}</FormHelperText>
            )}
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            id={field.id}
            name={field.id}
            label={field.label}
            type={field.type}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
            error={hasError}
            helperText={hasError ? errors[field.id] : field.helpText}
            inputProps={{
              ...(field.validation?.min !== undefined && { min: field.validation.min }),
              ...(field.validation?.max !== undefined && { max: field.validation.max }),
              ...(field.validation?.minLength !== undefined && { minLength: field.validation.minLength }),
              ...(field.validation?.maxLength !== undefined && { maxLength: field.validation.maxLength }),
              ...(field.validation?.pattern && { pattern: field.validation.pattern })
            }}
          />
        );
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>

        {isSubmitting && <LinearProgress sx={{ mb: 2 }} />}

        <Box component="form" onSubmit={handleSubmit}>
          {sections && sections.length > 0 ? (
            // Render sections with visual separation
            sections.map((section, sectionIndex) => (
              <Card key={sectionIndex} variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {section.title}
                  </Typography>
                  {section.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {section.description}
                    </Typography>
                  )}

                  <Grid container spacing={3}>
                    {section.fields.map(field => (
                      <Grid item xs={12} md={field.type === 'textarea' ? 12 : 6} key={field.id}>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            {field.label}
                            {field.required && <span style={{ color: 'red' }}>*</span>}
                          </Typography>
                          {renderField(field)}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))
          ) : (
            // Fallback to flat fields rendering
            <Grid container spacing={3}>
              {allFields.map(field => (
                <Grid item xs={12} md={field.type === 'textarea' ? 12 : 6} key={field.id}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {field.label}
                      {field.required && <span style={{ color: 'red' }}>*</span>}
                    </Typography>
                    {renderField(field)}
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}

          <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('dataForm.submitting') : (submitButtonText || t('dataForm.submitInfo'))}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};