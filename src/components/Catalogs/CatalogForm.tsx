import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Science as TestIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogService, type CreateCatalogRequest, type UpdateCatalogRequest, type Catalog, type ColumnSchema, type PermissionRule } from '../../services/catalogService';

interface CatalogFormProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  catalog?: Catalog | null;
}

export const CatalogForm: React.FC<CatalogFormProps> = ({
  open,
  onClose,
  mode,
  catalog
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    catalog_id: '',
    name: '',
    description: '',
    source_type: 'sql' as const,
    source_config: {
      connection_string: '',
      query: '',
      url: '',
      file_path: '',
      uploaded_file_id: '',
      uploaded_filename: '',
      file_size_bytes: null as number | null,
      delimiter: ',',
      has_header: true,
      sheet_name: '',
      endpoint: '',
      headers: {} as Record<string, string>,
      auth_config: {} as Record<string, any>,
      refresh_rate_minutes: 60,
      timeout_seconds: 30
    },
    schema: [] as ColumnSchema[],
    permissions: [] as PermissionRule[],
    cache_config: {
      enabled: true,
      ttl_seconds: 3600,
      max_size_mb: 100
    },
    tags: [] as string[]
  });

  const [newTag, setNewTag] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (catalog && (mode === 'edit' || mode === 'view')) {
      setFormData({
        catalog_id: catalog.catalog_id,
        name: catalog.name,
        description: catalog.description || '',
        source_type: catalog.source_type,
        source_config: {
          connection_string: catalog.source_config?.connection_string || '',
          query: catalog.source_config?.query || '',
          url: catalog.source_config?.url || '',
          file_path: catalog.source_config?.file_path || '',
          uploaded_file_id: catalog.source_config?.uploaded_file_id || '',
          uploaded_filename: catalog.source_config?.uploaded_filename || '',
          file_size_bytes: catalog.source_config?.file_size_bytes || null,
          delimiter: catalog.source_config?.delimiter || ',',
          has_header: catalog.source_config?.has_header || true,
          sheet_name: catalog.source_config?.sheet_name || '',
          endpoint: catalog.source_config?.endpoint || '',
          headers: catalog.source_config?.headers || {},
          auth_config: catalog.source_config?.auth_config || {},
          refresh_rate_minutes: catalog.source_config?.refresh_rate_minutes || 60,
          timeout_seconds: catalog.source_config?.timeout_seconds || 30
        },
        schema: catalog.schema || [],
        permissions: catalog.permissions || [],
        cache_config: catalog.cache_config || {
          enabled: true,
          ttl_seconds: 3600,
          max_size_mb: 100
        },
        tags: catalog.tags || []
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        catalog_id: '',
        name: '',
        description: '',
        source_type: 'sql',
        source_config: {
          connection_string: '',
          query: '',
          url: '',
          file_path: '',
          uploaded_file_id: '',
          uploaded_filename: '',
          file_size_bytes: null,
          delimiter: ',',
          has_header: true,
          sheet_name: '',
          endpoint: '',
          headers: {},
          auth_config: {},
          refresh_rate_minutes: 60,
          timeout_seconds: 30
        },
        schema: [],
        permissions: [],
        cache_config: {
          enabled: true,
          ttl_seconds: 3600,
          max_size_mb: 100
        },
        tags: []
      });
    }
  }, [catalog, mode, open]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCatalogRequest) => catalogService.createCatalog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      onClose();
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ catalogId, data }: { catalogId: string; data: UpdateCatalogRequest }) =>
      catalogService.updateCatalog(catalogId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogs'] });
      onClose();
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: catalogService.testConnection,
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: any) => {
      setTestResult({ success: false, message: error.message });
    }
  });

  // Preview data mutation
  const previewDataMutation = useMutation({
    mutationFn: catalogService.previewData,
    onSuccess: (result) => {
      setPreviewData(result.data);
      // Auto-populate schema from preview
      if (result.inferred_schema && result.inferred_schema.length > 0) {
        setFormData(prev => ({ ...prev, schema: result.inferred_schema }));
      }
    }
  });

  // File upload function
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadProgress(0);
    setUploadError(null);
    setSelectedFile(file);

    const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;
    const token = sessionStorage.getItem('kc_token');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/catalogs/upload-file`, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();

      // Update form data with uploaded file info
      setFormData(prev => ({
        ...prev,
        source_config: {
          ...prev.source_config,
          uploaded_file_id: result.file_id,
          uploaded_filename: result.filename,
          file_size_bytes: result.size_bytes,
          // Clear other source options when file is uploaded
          url: '',
          file_path: ''
        }
      }));

      setUploadProgress(100);

    } catch (error: any) {
      setUploadError(error.message);
      setSelectedFile(null);
    }
  };

  const handleSubmit = () => {
    // Transform source_type based on whether file is uploaded
    const submitData = { ...formData };

    // Convert generic source types to specific backend types
    if (formData.source_type === 'csv') {
      if (formData.source_config.uploaded_file_id) {
        submitData.source_type = 'csv_upload' as any;
      } else {
        submitData.source_type = 'csv_url' as any;
      }
    } else if (formData.source_type === 'excel') {
      if (formData.source_config.uploaded_file_id) {
        submitData.source_type = 'xlsx' as any;
      } else {
        submitData.source_type = 'xls' as any;
      }
    }

    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else if (mode === 'edit' && catalog) {
      updateMutation.mutate({
        catalogId: catalog.catalog_id,
        data: submitData
      });
    }
  };

  const handleTestConnection = () => {
    // Transform source_type for testing too
    let testSourceType = formData.source_type;
    if (formData.source_type === 'csv') {
      testSourceType = formData.source_config.uploaded_file_id ? 'csv_upload' : 'csv_url';
    } else if (formData.source_type === 'excel') {
      testSourceType = formData.source_config.uploaded_file_id ? 'xlsx' : 'xls';
    }

    testConnectionMutation.mutate({
      source_type: testSourceType as any,
      source_config: formData.source_config
    });
  };

  const handlePreviewData = () => {
    // Transform source_type for preview too
    let previewSourceType = formData.source_type;
    if (formData.source_type === 'csv') {
      previewSourceType = formData.source_config.uploaded_file_id ? 'csv_upload' : 'csv_url';
    } else if (formData.source_type === 'excel') {
      previewSourceType = formData.source_config.uploaded_file_id ? 'xlsx' : 'xls';
    }

    previewDataMutation.mutate({
      source_type: previewSourceType as any,
      source_config: formData.source_config,
      limit: 10
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const isReadOnly = mode === 'view';
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' && 'Crear Nuevo Catálogo'}
        {mode === 'edit' && 'Editar Catálogo'}
        {mode === 'view' && 'Detalles del Catálogo'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Basic Information */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID del Catálogo"
                value={formData.catalog_id}
                onChange={(e) => {
                  // Auto-format: lowercase, replace spaces with underscores, remove special chars
                  const cleanId = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_-]/g, '');
                  setFormData(prev => ({ ...prev, catalog_id: cleanId }));
                }}
                disabled={isReadOnly || mode === 'edit'}
                required
                helperText="Solo letras, números, guiones y guiones bajos (se formatea automáticamente)"
                error={formData.catalog_id && !/^[a-zA-Z0-9_-]+$/.test(formData.catalog_id)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    name: newName,
                    // Auto-generate catalog_id from name if empty and in create mode
                    catalog_id: (!prev.catalog_id && mode === 'create')
                      ? newName
                          .toLowerCase()
                          .replace(/\s+/g, '_')
                          .replace(/[^a-z0-9_-]/g, '')
                          .substring(0, 50)
                      : prev.catalog_id
                  }));
                }}
                disabled={isReadOnly}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isReadOnly}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>

          {/* Source Configuration */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Configuración de Fuente</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Fuente</InputLabel>
                    <Select
                      value={formData.source_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_type: e.target.value as any }))}
                      disabled={isReadOnly}
                      label="Tipo de Fuente"
                    >
                      <MenuItem value="sql">Base de Datos SQL</MenuItem>
                      <MenuItem value="csv">Archivo CSV</MenuItem>
                      <MenuItem value="excel">Archivo Excel</MenuItem>
                      <MenuItem value="json">API JSON</MenuItem>
                      <MenuItem value="api">API Externa</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Source-specific fields */}
                {formData.source_type === 'sql' && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Cadena de Conexión"
                        value={formData.source_config.connection_string}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          source_config: { ...prev.source_config, connection_string: e.target.value }
                        }))}
                        disabled={isReadOnly}
                        placeholder="postgresql://user:password@localhost/database"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Consulta SQL"
                        value={formData.source_config.query}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          source_config: { ...prev.source_config, query: e.target.value }
                        }))}
                        disabled={isReadOnly}
                        multiline
                        rows={3}
                        placeholder="SELECT * FROM tabla WHERE condicion"
                      />
                    </Grid>
                  </>
                )}

                {(formData.source_type === 'csv' || formData.source_type === 'excel') && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="URL o Ruta del Archivo"
                        value={formData.source_config.url || formData.source_config.file_path}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          source_config: {
                            ...prev.source_config,
                            url: e.target.value,
                            file_path: e.target.value,
                            // Clear uploaded file when using URL
                            uploaded_file_id: '',
                            uploaded_filename: '',
                            file_size_bytes: null
                          }
                        }))}
                        disabled={isReadOnly || !!formData.source_config.uploaded_file_id}
                        placeholder="https://example.com/data.csv or /path/to/file.xlsx"
                        helperText={formData.source_config.uploaded_file_id ? "Archivo subido activo - borra el archivo para usar URL" : "URL o ruta del archivo"}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        O sube un archivo:
                      </Typography>

                      {!isReadOnly && (
                        <Box sx={{ mb: 2 }}>
                          <input
                            accept=".csv,.xls,.xlsx"
                            style={{ display: 'none' }}
                            id="file-upload"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                            }}
                          />
                          <label htmlFor="file-upload">
                            <Button
                              variant="outlined"
                              component="span"
                              disabled={uploadProgress > 0 && uploadProgress < 100}
                              sx={{ mr: 2 }}
                            >
                              Seleccionar Archivo
                            </Button>
                          </label>

                          {selectedFile && (
                            <Typography variant="body2" component="span">
                              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </Typography>
                          )}
                        </Box>
                      )}

                      {formData.source_config.uploaded_file_id && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                          <Typography variant="body2" color="success.dark">
                            📁 Archivo subido: {formData.source_config.uploaded_filename}
                            {formData.source_config.file_size_bytes &&
                              ` (${(formData.source_config.file_size_bytes / 1024).toFixed(1)} KB)`
                            }
                          </Typography>
                          {!isReadOnly && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  source_config: {
                                    ...prev.source_config,
                                    uploaded_file_id: '',
                                    uploaded_filename: '',
                                    file_size_bytes: null
                                  }
                                }));
                                setSelectedFile(null);
                              }}
                              sx={{ mt: 1 }}
                            >
                              Eliminar Archivo
                            </Button>
                          )}
                        </Box>
                      )}

                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <Box sx={{ width: '100%', mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Subiendo archivo: {uploadProgress}%
                          </Typography>
                          <Box sx={{ width: '100%', bgcolor: 'grey.300', borderRadius: 1 }}>
                            <Box
                              sx={{
                                width: `${uploadProgress}%`,
                                bgcolor: 'primary.main',
                                height: 8,
                                borderRadius: 1,
                                transition: 'width 0.3s ease-in-out'
                              }}
                            />
                          </Box>
                        </Box>
                      )}

                      {uploadError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          Error subiendo archivo: {uploadError}
                        </Alert>
                      )}
                    </Grid>
                    {formData.source_type === 'csv' && (
                      <>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Delimitador"
                            value={formData.source_config.delimiter}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              source_config: { ...prev.source_config, delimiter: e.target.value }
                            }))}
                            disabled={isReadOnly}
                            placeholder=","
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={formData.source_config.has_header}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  source_config: { ...prev.source_config, has_header: e.target.checked }
                                }))}
                                disabled={isReadOnly}
                              />
                            }
                            label="Tiene Encabezados"
                          />
                        </Grid>
                      </>
                    )}
                    {formData.source_type === 'excel' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Nombre de la Hoja"
                          value={formData.source_config.sheet_name}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            source_config: { ...prev.source_config, sheet_name: e.target.value }
                          }))}
                          disabled={isReadOnly}
                          placeholder="Hoja1"
                        />
                      </Grid>
                    )}
                  </>
                )}

                {(formData.source_type === 'json' || formData.source_type === 'api') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="URL del Endpoint"
                      value={formData.source_config.endpoint}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        source_config: { ...prev.source_config, endpoint: e.target.value }
                      }))}
                      disabled={isReadOnly}
                      placeholder="https://api.example.com/data"
                    />
                  </Grid>
                )}

                {/* Test Connection & Preview */}
                {!isReadOnly && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<TestIcon />}
                        onClick={handleTestConnection}
                        disabled={testConnectionMutation.isPending}
                      >
                        Probar Conexión
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={handlePreviewData}
                        disabled={previewDataMutation.isPending}
                      >
                        Vista Previa
                      </Button>
                    </Box>

                    {testResult && (
                      <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                        {testResult.message}
                      </Alert>
                    )}

                    {previewData && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Vista Previa de Datos ({previewData.length} filas)
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', p: 1 }}>
                          <pre>{JSON.stringify(previewData.slice(0, 3), null, 2)}</pre>
                        </Box>
                      </Box>
                    )}
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Tags */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Etiquetas</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {!isReadOnly && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Nueva Etiqueta"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button variant="outlined" onClick={handleAddTag} startIcon={<AddIcon />}>
                    Agregar
                  </Button>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={!isReadOnly ? () => handleRemoveTag(tag) : undefined}
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Cache Configuration */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Configuración de Caché</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.cache_config.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          cache_config: { ...prev.cache_config, enabled: e.target.checked }
                        }))}
                        disabled={isReadOnly}
                      />
                    }
                    label="Habilitar Caché"
                  />
                </Grid>
                {formData.cache_config.enabled && (
                  <>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="TTL (segundos)"
                        type="number"
                        value={formData.cache_config.ttl_seconds}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          cache_config: { ...prev.cache_config, ttl_seconds: parseInt(e.target.value) }
                        }))}
                        disabled={isReadOnly}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Tamaño Máximo (MB)"
                        type="number"
                        value={formData.cache_config.max_size_mb}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          cache_config: { ...prev.cache_config, max_size_mb: parseInt(e.target.value) }
                        }))}
                        disabled={isReadOnly}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {!isReadOnly && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};