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
  const [validationDecision, setValidationDecision] = useState<string>('');
  const [validationComments, setValidationComments] = useState<string>('');

  const handleApprove = () => {
    onSubmit({
      validation_decision: 'approved',
      validation_comments: validationComments
    });
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
                    secondary={String(value)}
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
                    {entityGroup.replace('_', ' ').toUpperCase()}
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
                                {field.replace('_', ' ').toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {String(value)}
                              </Typography>
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
          return (
            <Box>
              {data && Object.entries(data).map(([uploadKey, files]) => (
                <Box key={uploadKey} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    {uploadKey.replace('upload_', '').replace('_s3_result', '').replace('_', ' ').toUpperCase()}
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
                                  border: '1px solid #ddd',
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
                              <strong>Origen:</strong> {file.source_task || 'Unknown'}
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

                            {/* Download Link */}
                            {file.url && (
                              <Button
                                variant="outlined"
                                size="small"
                                href={file.url}
                                target="_blank"
                                sx={{ mt: 1 }}
                              >
                                Descargar Original
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
                                  border: '1px solid #ddd',
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
                              <strong>Origen:</strong> {files.source_task || 'Unknown'}
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

                            {/* Download Link */}
                            {files.url && (
                              <Button
                                variant="outlined"
                                size="small"
                                href={files.url}
                                target="_blank"
                                sx={{ mt: 1 }}
                              >
                                Descargar Original
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
                                      {key.replace('_', ' ').toUpperCase()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {typeof value === 'boolean'
                                        ? (value ? 'Sí' : 'No')
                                        : typeof value === 'object' && value !== null
                                        ? JSON.stringify(value, null, 2)
                                        : String(value)}
                                    </Typography>
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
                                      {key.replace('_', ' ').toUpperCase()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {typeof value === 'boolean'
                                        ? (value ? 'Sí' : 'No')
                                        : typeof value === 'object' && value !== null
                                        ? JSON.stringify(value, null, 2)
                                        : String(value)}
                                    </Typography>
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

          {/* Comments Section */}
          <Box mt={4} p={3} sx={{ backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Comentarios de Validación
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Comentarios de Validación"
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