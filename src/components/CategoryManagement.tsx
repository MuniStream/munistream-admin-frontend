import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as WorkflowIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useI18n } from '../contexts/I18nContext';
import { categoryService, Category, CreateCategoryRequest } from '../services/categoryService';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const CategoryManagement: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#1976d2',
    icon: '📂'
  });

  // Predefined colors for categories
  const categoryColors = [
    '#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2',
    '#d32f2f', '#455a64', '#00796b', '#303f9f', '#689f38'
  ];

  // Icon mapping from backend Lucide icons to emojis
  const iconMap: Record<string, string> = {
    'edit': '📝',
    'lock': '🔒',
    'x-circle': '❌',
    'award': '🏆',
    'home': '🏠',
    'arrow-right': '➡️',
    'calculator': '🧮',
    'document': '📄',
    'link': '🔗',
    'folder': '📂',
    'user': '👤',
    'settings': '⚙️',
    'check': '✅',
    'star': '⭐',
    'heart': '❤️'
  };

  // Function to get emoji from backend icon
  const getEmojiIcon = (backendIcon: string): string => {
    return iconMap[backendIcon] || '📂'; // Default to folder emoji
  };

  // Predefined icons for new categories
  const categoryIcons = [
    '📂', '🏛️', '📝', '🏗️', '⚖️', '💼', '🎯', '📊', '🔧', '🌟', 
    '🏠', '➡️', '🧮', '📄', '🔗', '🔒', '❌', '🏆', '⭐', '❤️'
  ];

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryService.getCategories();
      setCategories(response.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      color: '#1976d2',
      icon: '📂'
    });
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon
    });
    setDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const categoryData: CreateCategoryRequest = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon
      };

      if (editingCategory) {
        // Update existing category
        await categoryService.updateCategory(editingCategory.id, categoryData);
      } else {
        // Create new category
        await categoryService.createCategory(categoryData);
      }
      
      // Reload categories from database
      await loadCategories();
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const confirmMessage = category.workflow_count > 0 
      ? `¿Estás seguro? Esta categoría tiene ${category.workflow_count} workflows asignados.`
      : '¿Estás seguro de que quieres eliminar esta categoría?';

    if (window.confirm(confirmMessage)) {
      try {
        await categoryService.deleteCategory(categoryId);
        // Reload categories from database
        await loadCategories();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting category');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🗂️ {t('categoryManagement')}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Gestiona las categorías de workflows y trámites
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCategories}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCategory}
          >
            {t('createCategory')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Categorías Disponibles ({categories.length} total)
          </Typography>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Workflows</TableCell>
                  <TableCell>{t('created')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: category.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}
                        >
                          {getEmojiIcon(category.icon)}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {category.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={category.color}
                            sx={{ 
                              backgroundColor: category.color,
                              color: 'white',
                              fontSize: '10px',
                              height: '18px'
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {category.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WorkflowIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {category.workflow_count} workflows
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(category.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCategory(category.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No hay categorías disponibles
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Category Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCategory ? t('editCategory') : t('createCategory')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label={t('categoryName')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t('categoryIcon')}</InputLabel>
                <Select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  label={t('categoryIcon')}
                >
                  {categoryIcons.map((icon) => (
                    <MenuItem key={icon} value={icon}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '20px' }}>{icon}</span>
                        <Typography>{icon}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label={t('categoryDescription')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('categoryColor')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {categoryColors.map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: formData.color === color ? '3px solid #000' : '2px solid #ddd',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Color seleccionado: {formData.color}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            disabled={!formData.name.trim()}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagement;