import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import { EntityViewer } from './EntityViewer';
import { GeoField } from './GeoField';
import { AddressField } from './AddressField';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { NEUTRAL } from '@/theme/tokens';
import FieldValue from './instance/operadores/FieldValue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Rótulo legible de una clave del contexto.
 *
 * `replace('_', ' ')` sustituye SOLO la primera ocurrencia, así que
 * `domicilio_destino_final` se leía "DOMICILIO DESTINO_FINAL". Con la bandera
 * global sale entero.
 */
const etiqueta = (clave: string) => clave.replace(/_/g, ' ').toUpperCase();

/**
 * Descarga un archivo del contexto de la instancia.
 *
 * La ruta de descarga dejó de estar abierta: antes bastaba conocer la llave de
 * S3 para bajar cualquier objeto del bucket. Ahora se pide primero un permiso
 * de vida corta, que el backend sólo emite para llaves que pertenecen a esta
 * instancia y a quien puede verla.
 */
async function downloadInstanceFile(instanceId: string, s3Key: string, filename: string) {
  const { data: grantData } = await api.post(`/instances/${instanceId}/files/grant`, {
    s3_keys: [s3Key],
  });
  const grant = (grantData?.grants || []).find((g: any) => g.s3_key === s3Key);
  if (!grant) throw new Error('El archivo no pertenece a esta instancia');

  const { data: blob } = await api.get(
    `/files/download/${s3Key}?t=${encodeURIComponent(grant.token)}`,
    { responseType: 'blob' },
  );

  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.URL.revokeObjectURL(url);
  }
}



interface ContextValidationDisplayProps {
  instanceId: string;
  formConfig: {
    title: string;
    description: string;
    sections?: Array<{
      title: string;
      type: string;
      data: any;
      collapsible?: boolean;
      collapsed?: boolean;
    }>;
    validation_fields?: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
      options?: Array<{
        value: string;
        label: string;
      }>;
      placeholder?: string;
    }>;
    // Campos del contexto que el revisor puede corregir antes de aprobar.
    editable_fields?: Array<{
      name: string;
      label?: string;
      type?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      helperText?: string;
      value?: any;
      // Config de tipos compuestos:
      geo_mode?: 'point' | 'polygon';
      with_contact?: boolean;
      region_only?: boolean;
      config?: any;
    }>;
  };
  onSubmit: (data: Record<string, any>) => void;
  loading: boolean;
  error?: string | null;
}

export const ContextValidationDisplay: React.FC<ContextValidationDisplayProps> = ({
  instanceId,
  formConfig,
  onSubmit,
  loading,
  error
}) => {
  const { t } = useTranslation();
  const [validationDecision, setValidationDecision] = useState<string>('');
  const [validationComments, setValidationComments] = useState<string>('');

  // Campos editables: correcciones del revisor al expediente, precargadas con el
  // valor actual del contexto. Viajan como campos planos en el envío (el backend
  // los lee de `{task}_input` por su `name`, que puede ser una ruta con puntos).
  const editableFields = formConfig.editable_fields || [];
  const [editedValues, setEditedValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of formConfig.editable_fields || []) init[f.name] = f.value ?? '';
    return init;
  });
  const [editError, setEditError] = useState<string | null>(null);
  const setEdited = (name: string, v: any) =>
    setEditedValues((prev) => ({ ...prev, [name]: v }));

  const handleApprove = () => {
    const faltantes = editableFields.filter(
      (f) => f.required && (editedValues[f.name] === '' || editedValues[f.name] == null)
    );
    if (faltantes.length) {
      setEditError(
        `Complete los campos obligatorios: ${faltantes.map((f) => f.label || f.name).join(', ')}`
      );
      return;
    }
    setEditError(null);
    // El envío del admin es multipart y hace String(value); los tipos compuestos
    // (geo/address = objetos) deben ir como JSON string para que el backend los
    // recoercione a dict (igual que hace el portal ciudadano).
    const payload: Record<string, any> = {
      validation_decision: 'approved',
      validation_comments: validationComments,
    };
    for (const [k, val] of Object.entries(editedValues)) {
      payload[k] = val !== null && typeof val === 'object' ? JSON.stringify(val) : val;
    }
    onSubmit(payload);
  };

  const handleReject = () => {
    onSubmit({
      validation_decision: 'rejected',
      validation_comments: validationComments
    });
  };

  const renderDataSection = (section: any) => {
    const { title, type, data, collapsible = false, collapsed = false } = section;

    const renderContent = () => {
      switch (type) {
        case 'info_display':
          return (
            <List dense>
              {data && Object.entries(data).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={key}
                    secondary={<FieldValue name={key} value={value} />}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              ))}
            </List>
          );

        case 'entities_display':
          return (
            <Box>
              {data && Object.entries(data).map(([entityGroup, entities]) => (
                <Box key={entityGroup} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    {etiqueta(entityGroup)}
                  </Typography>
                  {Array.isArray(entities) ? entities.map((entity: any, index: number) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Typography variant="body2">
                          <strong>Nombre:</strong> {entity.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Tipo:</strong> {entity.entity_type || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>ID:</strong> {entity.entity_id || 'N/A'}
                        </Typography>
                        {entity.created_at && (
                          <Typography variant="body2">
                            <strong>Fecha:</strong> {new Date(entity.created_at).toLocaleDateString()}
                          </Typography>
                        )}

                        {/* Entity Viewer with iframe */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Vista previa del documento:
                          </Typography>
                          <EntityViewer
                            entityId={entity.entity_id}
                            entityName={entity.name}
                            apiBaseUrl={`${API_URL}/api/v1`}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  )) : (
                    <Typography variant="body2" color="text.secondary">
                      {entities?.error || 'No hay entidades disponibles'}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          );

        case 'form_data_display':
          return (
            <Box>
              {data && Object.entries(data).map(([formType, formData]) => (
                <Box key={formType} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    {formType}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableBody>
                        {Object.entries(formData as Record<string, any>).map(([field, value]) => (
                          <TableRow key={field}>
                            <TableCell component="th" scope="row">
                              <Typography variant="body2" fontWeight="medium">
                                {etiqueta(field)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <FieldValue name={field} value={value} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
          );

        case 's3_files_display':
        case 'files_display_with_viewer':
          return (
            <Box>
              {data && Object.entries(data).map(([uploadKey, files]) => (
                <Box key={uploadKey} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    {etiqueta(uploadKey.replace('upload_', '').replace('_s3_result', ''))}
                  </Typography>
                  {Array.isArray(files) ? files.map((file: any, index: number) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Box display="flex" alignItems="flex-start" gap={2}>
                          {/* File Preview */}
                          {file.preview_data && !file.error && (
                            <Box sx={{ flexShrink: 0 }}>
                              <img
                                src={`data:image/png;base64,${file.preview_data}`}
                                alt={file.filename}
                                style={{
                                  maxWidth: '150px',
                                  maxHeight: '150px',
                                  objectFit: 'contain',
                                  border: `1px solid ${NEUTRAL.border}`,
                                  borderRadius: '4px'
                                }}
                              />
                            </Box>
                          )}

                          {/* File Info */}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">
                              <strong>Archivo:</strong> {file.filename}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Origen:</strong> {file.source_task || t('ctxval.unknown')}
                            </Typography>
                            {file.size && (
                              <Typography variant="body2">
                                <strong>Tamaño:</strong> {(file.size / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                            {file.file_type && (
                              <Typography variant="body2">
                                <strong>Tipo:</strong> {file.file_type.toUpperCase()}
                              </Typography>
                            )}
                            {file.error && (
                              <Typography variant="body2" color="error">
                                <strong>Error:</strong> {file.error}
                              </Typography>
                            )}

                            {/* Download Button - Use proxy download like EntityViewer */}
                            {file.s3_key && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={async () => {
                                  try {
                                    await downloadInstanceFile(instanceId, file.s3_key, file.filename);
                                  } catch (err) {
                                    console.error('Error downloading file:', err);
                                  }
                                }}
                                sx={{ mt: 1 }}
                              >
                                Descargar Archivo
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )) : (
                    <Card variant="outlined" sx={{ mb: 1 }}>
                      <CardContent>
                        <Box display="flex" alignItems="flex-start" gap={2}>
                          {/* Single File Preview */}
                          {files.preview_data && !files.error && (
                            <Box sx={{ flexShrink: 0 }}>
                              <img
                                src={`data:image/png;base64,${files.preview_data}`}
                                alt={files.filename}
                                style={{
                                  maxWidth: '150px',
                                  maxHeight: '150px',
                                  objectFit: 'contain',
                                  border: `1px solid ${NEUTRAL.border}`,
                                  borderRadius: '4px'
                                }}
                              />
                            </Box>
                          )}

                          {/* Single File Info */}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">
                              <strong>Archivo:</strong> {files.filename}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Origen:</strong> {files.source_task || t('ctxval.unknown')}
                            </Typography>
                            {files.size && (
                              <Typography variant="body2">
                                <strong>Tamaño:</strong> {(files.size / 1024).toFixed(1)} KB
                              </Typography>
                            )}
                            {files.file_type && (
                              <Typography variant="body2">
                                <strong>Tipo:</strong> {files.file_type.toUpperCase()}
                              </Typography>
                            )}
                            {files.error && (
                              <Typography variant="body2" color="error">
                                <strong>Error:</strong> {files.error}
                              </Typography>
                            )}

                            {/* Download Button - Use proxy download like EntityViewer */}
                            {files.s3_key && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={async () => {
                                  try {
                                    await downloadInstanceFile(instanceId, files.s3_key, files.filename);
                                  } catch (err) {
                                    console.error('Error downloading file:', err);
                                  }
                                }}
                                sx={{ mt: 1 }}
                              >
                                Descargar Archivo
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              ))}
            </Box>
          );

        case 'catalog_selections_display':
          return (
            <Box>
              {data && Object.entries(data).map(([selectionKey, selection]) => (
                <Box key={selectionKey} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    {(selection as any)?.catalog_name || etiqueta(selectionKey.replace('selected_', ''))}
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableBody>
                            {(selection as any)?.fields && Object.entries((selection as any).fields).map(([field, value]) => (
                              <TableRow key={field}>
                                <TableCell component="th" scope="row">
                                  <Typography variant="body2" fontWeight="medium">
                                    {etiqueta(field)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <FieldValue name={field} value={value} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          );

        case 'validation_results_display':
          return (
            <Box>
              {data && Object.entries(data).map(([validationType, validationData]) => (
                <Card key={validationType} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {validationType}
                    </Typography>

                    {/* Validation Score */}
                    {(validationData as any)?.score !== undefined && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Puntuación de Calidad:</strong> {(validationData as any).score}
                        </Typography>
                        <Chip
                          label={`Score: ${(validationData as any).score}`}
                          color={(validationData as any).score >= 80 ? 'success' : (validationData as any).score >= 60 ? 'warning' : 'error'}
                          size="small"
                        />
                      </Box>
                    )}

                    {/* Validation Details */}
                    {(validationData as any)?.validation_details && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Detalles de Validación:
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableBody>
                              {Object.entries((validationData as any).validation_details).map(([key, value]) => (
                                <TableRow key={key}>
                                  <TableCell component="th" scope="row">
                                    <Typography variant="body2" fontWeight="medium">
                                      {etiqueta(key)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <FieldValue name={key} value={value} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}

                    {/* Provenance Information */}
                    {(validationData as any)?.provenance && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Información de Captura:
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableBody>
                              {Object.entries((validationData as any).provenance)
                                .filter(([key, value]) => value !== null && value !== undefined)
                                .map(([key, value]) => (
                                <TableRow key={key}>
                                  <TableCell component="th" scope="row">
                                    <Typography variant="body2" fontWeight="medium">
                                      {etiqueta(key)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <FieldValue name={key} value={value} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          );

        case 'json_display':
          return (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </Box>
          );

        default:
          return (
            <Typography variant="body2" color="text.secondary">
              Tipo de sección desconocido: {type}
            </Typography>
          );
      }
    };

    if (collapsible) {
      return (
        <Accordion key={title} defaultExpanded={!collapsed}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderContent()}
          </AccordionDetails>
        </Accordion>
      );
    }

    return (
      <Card key={title} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          {renderContent()}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Card sx={{ mb: 3, border: 2, borderColor: 'info.main' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {formConfig.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {formConfig.description}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Render data sections */}
          {formConfig.sections && formConfig.sections.map((section, index) => (
            <div key={index}>
              {renderDataSection(section)}
            </div>
          ))}

          {/* Correcciones del revisor al expediente (campos editables) */}
          {editableFields.length > 0 && (
            <Box mt={4} p={3} sx={{ border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Correcciones al expediente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Puede corregir estos datos antes de aprobar. Los cambios se aplicarán al trámite.
              </Typography>
              {editError && (
                <Alert severity="warning" sx={{ mb: 2 }}>{editError}</Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {editableFields.map((f) => {
                  const tipo = f.type || 'text';
                  const common = {
                    fullWidth: true,
                    label: f.label || f.name,
                    required: !!f.required,
                    helperText: f.helperText,
                    value: editedValues[f.name] ?? '',
                    onChange: (e: any) => setEdited(f.name, e.target.value),
                  } as const;
                  if (tipo === 'geo') {
                    return (
                      <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {f.label || f.name}{f.required ? ' *' : ''}
                        </Typography>
                        {f.helperText && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{f.helperText}</Typography>
                        )}
                        <GeoField
                          mode={f.geo_mode || 'polygon'}
                          value={editedValues[f.name] || null}
                          onChange={(val: any) => setEdited(f.name, val)}
                        />
                      </Box>
                    );
                  }
                  if (tipo === 'address') {
                    return (
                      <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                          {f.label || f.name}{f.required ? ' *' : ''}
                        </Typography>
                        {f.helperText && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{f.helperText}</Typography>
                        )}
                        <AddressField
                          value={editedValues[f.name] || {}}
                          onChange={(val: any) => setEdited(f.name, val)}
                          config={f.config}
                          withContact={f.with_contact}
                          regionOnly={f.region_only}
                        />
                      </Box>
                    );
                  }
                  if (tipo === 'select') {
                    return (
                      <TextField key={f.name} select SelectProps={{ native: true }} {...common}>
                        <option value=""></option>
                        {(f.options || []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </TextField>
                    );
                  }
                  if (tipo === 'textarea') {
                    return <TextField key={f.name} multiline rows={2} sx={{ gridColumn: '1 / -1' }} {...common} />;
                  }
                  return (
                    <TextField
                      key={f.name}
                      type={tipo === 'number' ? 'number' : tipo === 'date' ? 'date' : 'text'}
                      InputLabelProps={tipo === 'date' ? { shrink: true } : undefined}
                      {...common}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Comments Section */}
          <Box mt={4} p={3} sx={{ backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Comentarios de Validación
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('validationComments')}
              placeholder="Comentarios opcionales sobre la decisión de validación..."
              value={validationComments}
              onChange={(e) => setValidationComments(e.target.value)}
              margin="normal"
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Aprobando...' : 'Aprobar Contexto'}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<RejectIcon />}
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? 'Rechazando...' : 'Rechazar Contexto'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};