import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Checkbox,
  Radio,
  CircularProgress,
  Alert,
  Pagination,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { api } from '../services/api';

export interface CatalogColumn {
  name: string;
  type: string;
  searchable?: boolean;
  filterable?: boolean;
  displayName?: string;
}

export interface CatalogConfig {
  catalog_id: string;
  catalog_name?: string;
  selection_mode: 'single' | 'multiple';
  min_selections: number;
  max_selections: number;
  display_columns: string[];
  search_enabled: boolean;
  filters_enabled: boolean;
  sorting_enabled: boolean;
  pagination_enabled: boolean;
  page_size: number;
  default_filters?: Record<string, any>;
}

export interface AdminCatalogSelectorProps {
  title: string;
  description: string;
  catalog_config: CatalogConfig;
  validation?: {
    required: boolean;
    min_selections: number;
    max_selections: number;
  };
  validation_errors?: string[];
  previous_input?: {
    selected_items: any[];
  };
  onSubmit: (data: { selected_items: any[] }) => void;
  onCancel?: () => void;
}

interface CatalogData {
  data: any[];
  total_count: number;
  page: number;
  page_size: number;
  visible_columns: string[];
}

interface CatalogSchema {
  catalog_id: string;
  schema: CatalogColumn[];
  searchable_columns: string[];
  filterable_columns: string[];
}

export const AdminCatalogSelector: React.FC<AdminCatalogSelectorProps> = ({
  title,
  description,
  catalog_config,
  validation,
  validation_errors = [],
  previous_input,
  onSubmit,
  onCancel
}) => {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [catalogSchema, setCatalogSchema] = useState<CatalogSchema | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(catalog_config.default_filters || {});

  // Initialize selected items from previous input
  useEffect(() => {
    if (previous_input?.selected_items) {
      setSelectedItems(previous_input.selected_items);
    }
  }, [previous_input]);

  // Fetch catalog schema on mount
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await api.get(`/catalogs/${catalog_config.catalog_id}/schema`);
        setCatalogSchema(response.data);
      } catch (err: any) {
        console.error('Error fetching catalog schema:', err);
        setError('Failed to load catalog schema');
      }
    };

    fetchSchema();
  }, [catalog_config.catalog_id]);

  // Fetch catalog data
  const fetchData = useCallback(async () => {
    if (!catalog_config.catalog_id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery && catalog_config.search_enabled) {
        params.append('search', searchQuery);
      }

      if (Object.keys(filters).length > 0 && catalog_config.filters_enabled) {
        params.append('filters', JSON.stringify(filters));
      }

      if (sortBy && catalog_config.sorting_enabled) {
        params.append('sort_by', sortBy);
        params.append('sort_desc', sortDesc.toString());
      }

      if (catalog_config.pagination_enabled) {
        params.append('page', (currentPage - 1).toString()); // Convert to 0-based for API
        params.append('page_size', catalog_config.page_size.toString());
      }

      const response = await api.get(
        `/catalogs/${catalog_config.catalog_id}/data?${params.toString()}`
      );

      setCatalogData(response.data);
    } catch (err: any) {
      console.error('Error fetching catalog data:', err);
      setError(err.response?.data?.detail || 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [
    catalog_config.catalog_id,
    catalog_config.search_enabled,
    catalog_config.filters_enabled,
    catalog_config.sorting_enabled,
    catalog_config.pagination_enabled,
    catalog_config.page_size,
    searchQuery,
    filters,
    sortBy,
    sortDesc,
    currentPage
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      fetchData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleItemSelect = (item: any) => {
    if (catalog_config.selection_mode === 'single') {
      // Single selection mode
      const isSelected = selectedItems.some(selected =>
        JSON.stringify(selected) === JSON.stringify(item)
      );

      if (isSelected) {
        setSelectedItems([]);
      } else {
        setSelectedItems([item]);
      }
    } else {
      // Multiple selection mode
      const isSelected = selectedItems.some(selected =>
        JSON.stringify(selected) === JSON.stringify(item)
      );

      if (isSelected) {
        setSelectedItems(prev => prev.filter(selected =>
          JSON.stringify(selected) !== JSON.stringify(item)
        ));
      } else {
        if (selectedItems.length < catalog_config.max_selections) {
          setSelectedItems(prev => [...prev, item]);
        }
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({ selected_items: selectedItems });
  };

  const isItemSelected = (item: any) => {
    return selectedItems.some(selected =>
      JSON.stringify(selected) === JSON.stringify(item)
    );
  };

  const canSelectMore = () => {
    return catalog_config.selection_mode === 'multiple' &&
           selectedItems.length < catalog_config.max_selections;
  };

  const isValidSelection = () => {
    return selectedItems.length >= catalog_config.min_selections &&
           selectedItems.length <= catalog_config.max_selections;
  };

  const getColumnDisplayName = (columnName: string): string => {
    if (!catalogSchema) return columnName;

    const column = catalogSchema.schema.find(col => col.name === columnName);
    return column?.displayName || columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSort = (columnName: string) => {
    if (!catalog_config.sorting_enabled) return;

    if (sortBy === columnName) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(columnName);
      setSortDesc(false);
    }
  };

  if (loading && !catalogData) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Cargando catálogo...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Por favor espera mientras obtenemos los datos
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert
            severity="error"
            action={
              <Button onClick={fetchData} startIcon={<RefreshIcon />}>
                Reintentar
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Error al cargar el catálogo
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>

          {validation_errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validation_errors.map((error, index) => (
                <Typography key={index} variant="body2">
                  {error}
                </Typography>
              ))}
            </Alert>
          )}
        </Box>

        {/* Search and Controls */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            {catalog_config.search_enabled && catalogSchema && catalogSchema.searchable_columns.length > 0 && (
              <TextField
                fullWidth
                variant="outlined"
                placeholder={`Buscar en ${catalogSchema.searchable_columns.join(', ')}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                }}
                sx={{ flexGrow: 1, minWidth: 300 }}
              />
            )}

            <Tooltip title="Actualizar datos">
              <IconButton onClick={fetchData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Selection Status */}
        <Box sx={{ mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={1} alignItems="center">
              <Chip
                label={`Seleccionado: ${selectedItems.length}`}
                color={isValidSelection() ? 'success' : 'default'}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                de {catalog_config.selection_mode === 'single' ? '1' : catalog_config.max_selections} máximo
              </Typography>
              {catalog_config.min_selections > 0 && (
                <Chip
                  label={`Mínimo: ${catalog_config.min_selections}`}
                  size="small"
                  color={selectedItems.length >= catalog_config.min_selections ? 'success' : 'error'}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {catalogData ? `${catalogData.total_count} registros totales` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Data Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 50 }}>
                  {catalog_config.selection_mode === 'multiple' ? (
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && selectedItems.length < (catalogData?.data.length || 0)}
                      checked={catalogData ? selectedItems.length === catalogData.data.length : false}
                      onChange={(e) => {
                        if (e.target.checked && catalogData) {
                          const newSelections = catalogData.data.slice(0, catalog_config.max_selections);
                          setSelectedItems(newSelections);
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      disabled={!canSelectMore() && selectedItems.length === 0}
                    />
                  ) : null}
                </TableCell>
                {catalog_config.display_columns.map(columnName => (
                  <TableCell
                    key={columnName}
                    onClick={() => handleSort(columnName)}
                    sx={{
                      cursor: catalog_config.sorting_enabled ? 'pointer' : 'default',
                      userSelect: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      {getColumnDisplayName(columnName)}
                      {catalog_config.sorting_enabled && (
                        <Tooltip title="Ordenar">
                          <SortIcon
                            fontSize="small"
                            color={sortBy === columnName ? 'primary' : 'disabled'}
                            sx={{
                              transform: sortBy === columnName && sortDesc ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!catalogData || catalogData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={catalog_config.display_columns.length + 1} sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ color: 'text.secondary' }}>
                      <Typography variant="h6" gutterBottom>
                        📋 No hay datos disponibles
                      </Typography>
                      {searchQuery && (
                        <Typography variant="body2">
                          Intenta modificar tu búsqueda: "{searchQuery}"
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                catalogData.data.map((item, index) => {
                  const isSelected = isItemSelected(item);
                  const canSelect = canSelectMore() || isSelected || catalog_config.selection_mode === 'single';

                  return (
                    <TableRow
                      key={index}
                      hover
                      onClick={() => canSelect && handleItemSelect(item)}
                      sx={{
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        backgroundColor: isSelected ? 'action.selected' : 'transparent',
                        opacity: canSelect ? 1 : 0.6,
                        '&:hover': {
                          backgroundColor: canSelect ? 'action.hover' : 'inherit'
                        }
                      }}
                    >
                      <TableCell padding="checkbox">
                        {catalog_config.selection_mode === 'single' ? (
                          <Radio
                            checked={isSelected}
                            disabled={!canSelect}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            disabled={!canSelect}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </TableCell>
                      {catalog_config.display_columns.map(columnName => (
                        <TableCell key={columnName}>
                          {item[columnName] !== undefined && item[columnName] !== null
                            ? String(item[columnName])
                            : '-'
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {catalog_config.pagination_enabled && catalogData && catalogData.total_count > catalog_config.page_size && (
          <Box display="flex" justifyContent="center" sx={{ mb: 2 }}>
            <Pagination
              count={Math.ceil(catalogData.total_count / catalog_config.page_size)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              size="large"
            />
          </Box>
        )}

        {/* Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}

          <Box display="flex" alignItems="center" gap={2}>
            {!isValidSelection() && (
              <Alert severity="warning" sx={{ flexGrow: 1 }}>
                <Typography variant="body2">
                  {selectedItems.length < catalog_config.min_selections
                    ? `Selecciona al menos ${catalog_config.min_selections} elemento(s)`
                    : `Selecciona máximo ${catalog_config.max_selections} elemento(s)`
                  }
                </Typography>
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isValidSelection()}
              size="large"
            >
              Continuar
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};