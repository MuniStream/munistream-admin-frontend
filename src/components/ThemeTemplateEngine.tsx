import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import DOMPurify from 'dompurify';

interface TemplateEngineProps {
  templateName: string;
  data?: Record<string, any>;
  onLoad?: (content: string) => void;
  onError?: (error: string) => void;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

interface TemplateVariables {
  colors: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
  borders: Record<string, any>;
  shadows: Record<string, any>;
  components: Record<string, any>;
  custom_variables: Record<string, any>;
  i18n: Record<string, any>;
  metadata: Record<string, any>;
  variables: Record<string, any>;
  assets: Record<string, any>;
  layout: Record<string, any>;
  admin: Record<string, any>;
  slot: Record<string, any>;
  [key: string]: any;
}

/**
 * ThemeTemplateEngine for Admin Frontend
 *
 * Features:
 * - Loads HTML templates from the backend admin theme system
 * - Performs Handlebars-style variable substitution
 * - Supports slot content injection
 * - Handles template caching for performance
 * - Provides error handling and fallback content
 * - Sanitizes HTML content for security
 * - Admin-specific context and helpers
 */
export const ThemeTemplateEngine: React.FC<TemplateEngineProps> = ({
  templateName,
  data = {},
  onLoad,
  onError,
  className,
  style,
  fallback = null,
}) => {
  const [templateContent, setTemplateContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const { themeConfig } = useTheme();

  // Template cache to avoid repeated requests
  const templateCache = React.useRef<Map<string, string>>(new Map());

  /**
   * Load template from backend or cache
   */
  const loadTemplate = async (name: string): Promise<string> => {
    // Check cache first
    const cacheKey = `admin-${name}`;
    if (templateCache.current.has(cacheKey)) {
      return templateCache.current.get(cacheKey)!;
    }

    try {
      const response = await api.get(`/themes/admin/templates/${name}`);
      const content = response.data.content || response.data.template || '';

      // Cache the template
      templateCache.current.set(cacheKey, content);

      return content;
    } catch (err) {
      throw new Error(`Template loading failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Process template variables and perform substitution
   */
  const processTemplate = (template: string, variables: TemplateVariables): string => {
    let processed = template;

    // Helper function for nested object access
    const getNestedValue = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? current[key] : undefined;
      }, obj);
    };

    // Process simple variables {{variable}}
    processed = processed.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
      const trimmedPath = variablePath.trim();

      // Handle slot injection {{slot:slot_name}}
      if (trimmedPath.startsWith('slot:')) {
        const slotName = trimmedPath.replace('slot:', '');
        return variables.slot?.[slotName] || '';
      }

      // Handle helper functions like {{format_date date}}
      if (trimmedPath.includes(' ')) {
        const [helperName, ...args] = trimmedPath.split(' ');
        return handleTemplateHelper(helperName, args, variables);
      }

      // Handle conditional expressions {{#if condition}}
      if (trimmedPath.startsWith('#if ') || trimmedPath.startsWith('/if') ||
          trimmedPath.startsWith('#unless ') || trimmedPath.startsWith('/unless') ||
          trimmedPath.startsWith('#each ') || trimmedPath.startsWith('/each') ||
          trimmedPath.startsWith('else')) {
        return handleHandlebarsBlock(match, trimmedPath, variables);
      }

      // Regular variable substitution
      const value = getNestedValue(variables, trimmedPath);

      if (value === null || value === undefined) {
        return '';
      }

      return String(value);
    });

    return processed;
  };

  /**
   * Handle template helper functions (Admin-specific)
   */
  const handleTemplateHelper = (helper: string, args: string[], variables: TemplateVariables): string => {
    switch (helper) {
      case 'format_date':
        const dateStr = getVariableValue(args[0], variables);
        return formatDate(dateStr);

      case 'format_relative_time':
        const relativeDate = getVariableValue(args[0], variables);
        return formatRelativeTime(relativeDate);

      case 'format_currency':
        const amount = getVariableValue(args[0], variables);
        return formatCurrency(amount);

      case 'format_number':
        const number = getVariableValue(args[0], variables);
        const format = getVariableValue(args[1], variables) || 'default';
        return formatNumber(number, format);

      case 'format_percentage':
        const percentage = getVariableValue(args[0], variables);
        return formatPercentage(percentage);

      case 'format_duration':
        const seconds = getVariableValue(args[0], variables);
        return formatDuration(seconds);

      case 'truncate':
      case 'truncate_text':
        const text = getVariableValue(args[0], variables);
        const length = parseInt(args[1]) || 50;
        return truncateText(text, length);

      case 'get_status_color':
        const status = getVariableValue(args[0], variables);
        return getStatusColor(status, variables.colors);

      case 'get_workflow_status_color':
        const workflowStatus = getVariableValue(args[0], variables);
        return getWorkflowStatusColor(workflowStatus, variables.colors);

      case 'get_step_type_color':
        const stepType = getVariableValue(args[0], variables);
        return getStepTypeColor(stepType, variables.colors);

      case 'get_metric_color':
        const value = getVariableValue(args[0], variables);
        const thresholds = getVariableValue(args[1], variables);
        return getMetricColor(value, thresholds, variables.colors);

      case 'get_notification_icon':
        const notificationType = getVariableValue(args[0], variables);
        return getNotificationIcon(notificationType);

      case 'calculate_percentage':
        const val = getVariableValue(args[0], variables);
        const total = getVariableValue(args[1], variables);
        return calculatePercentage(val, total);

      case 'eq':
        const val1 = getVariableValue(args[0], variables);
        const val2 = getVariableValue(args[1], variables);
        return val1 === val2 ? 'true' : 'false';

      case 'add':
        const a = parseFloat(getVariableValue(args[0], variables)) || 0;
        const b = parseFloat(getVariableValue(args[1], variables)) || 0;
        return String(a + b);

      case 'subtract':
        const x = parseFloat(getVariableValue(args[0], variables)) || 0;
        const y = parseFloat(getVariableValue(args[1], variables)) || 0;
        return String(x - y);

      default:
        return '';
    }
  };

  /**
   * Handle Handlebars-style block helpers (simplified implementation)
   */
  const handleHandlebarsBlock = (match: string, expression: string, variables: TemplateVariables): string => {
    // This is a simplified implementation - in a full implementation,
    // you would need a proper Handlebars parser
    return match; // Return as-is for now
  };

  /**
   * Get variable value from string path
   */
  const getVariableValue = (path: string, variables: TemplateVariables): any => {
    if (!path) return '';

    // Remove quotes if present
    const cleanPath = path.replace(/['"]/g, '');

    return cleanPath.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, variables);
  };

  /**
   * Template helper functions (Admin-specific)
   */
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    if (days < 7) return `hace ${days}d`;
    return date.toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number') return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatNumber = (value: number, format: string): string => {
    if (typeof value !== 'number') return String(value || 0);

    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return `${value}%`;
      case 'compact':
        return new Intl.NumberFormat('es-MX', {
          notation: 'compact',
          compactDisplay: 'short'
        }).format(value);
      default:
        return new Intl.NumberFormat('es-MX').format(value);
    }
  };

  const formatPercentage = (value: number): string => {
    return Math.abs(value).toFixed(1);
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const truncateText = (text: string, length: number): string => {
    if (!text || typeof text !== 'string') return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const getStatusColor = (status: string, colors: any): string => {
    const statusColors: Record<string, string> = {
      pending: colors?.custom?.status_pending || colors?.warning || '#ff9800',
      running: colors?.primary_main || '#1976d2',
      completed: colors?.custom?.status_approved || colors?.success || '#4caf50',
      failed: colors?.custom?.status_rejected || colors?.error || '#f44336',
      cancelled: colors?.text_disabled || '#9e9e9e',
    };
    return statusColors[status] || colors?.text_disabled || '#9e9e9e';
  };

  const getWorkflowStatusColor = (status: string, colors: any): string => {
    const workflowColors: Record<string, string> = {
      active: colors?.success || '#4caf50',
      inactive: colors?.text_disabled || '#9e9e9e',
      draft: colors?.custom?.status_draft || '#9e9e9e',
      deprecated: colors?.warning || '#ff9800',
      error: colors?.error || '#f44336',
    };
    return workflowColors[status] || colors?.text_disabled || '#9e9e9e';
  };

  const getStepTypeColor = (type: string, colors: any): string => {
    const typeColors: Record<string, string> = {
      action: colors?.primary_main || '#1976d2',
      approval: colors?.warning || '#ff9800',
      condition: colors?.info || '#2196f3',
      notification: colors?.secondary_main || '#f50057',
      document: colors?.success || '#4caf50',
      integration: colors?.custom?.priority_medium || '#ff9800',
    };
    return typeColors[type] || colors?.text_disabled || '#9e9e9e';
  };

  const getMetricColor = (value: number, thresholds: any, colors: any): string => {
    if (!thresholds || typeof value !== 'number') return colors?.text_primary || '#212529';

    if (thresholds.critical && value >= thresholds.critical) return colors?.error || '#f44336';
    if (thresholds.warning && value >= thresholds.warning) return colors?.warning || '#ff9800';
    if (thresholds.good && value >= thresholds.good) return colors?.success || '#4caf50';
    return colors?.text_primary || '#212529';
  };

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      workflow: '📋',
      approval: '✅',
      document: '📄',
      system: '⚙️',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || '📢';
  };

  const calculatePercentage = (value: number, total: number): string => {
    if (total === 0) return '0';
    return String(Math.round((value / total) * 100));
  };

  /**
   * Prepare template variables (Admin-specific)
   */
  const prepareVariables = (): TemplateVariables => {
    return {
      // Theme variables
      colors: themeConfig?.colors || {},
      typography: themeConfig?.typography || {},
      spacing: themeConfig?.spacing || {},
      borders: themeConfig?.borders || {},
      shadows: {},
      components: themeConfig?.components || {},
      custom_variables: {},

      // Admin-specific configuration
      admin: {},

      // Metadata and configuration
      metadata: themeConfig?.metadata || {},
      variables: {},
      assets: themeConfig?.assets || {},
      layout: {},

      // Internationalization (Admin-specific)
      i18n: {
        // Dashboard
        dashboard: 'Panel Administrativo',
        dashboard_header: 'Encabezado del Dashboard',
        statistics: 'Estadísticas',
        analytics: 'Análisis',
        reports: 'Reportes',

        // Workflows
        workflows: 'Workflows',
        workflow_instances: 'Instancias de Workflow',
        workflow_management: 'Gestión de Workflows',
        view_workflows: 'Ver Workflows',
        view_instances: 'Ver Instancias',
        create_workflow: 'Crear Workflow',

        // Instances
        instances: 'Instancias',
        instance_id: 'ID de Instancia',
        instance_details: 'Detalles de Instancia',
        view_details: 'Ver Detalles',
        view_instance: 'Ver Instancia',

        // Status
        status: 'Estado',
        status_pending: 'Pendiente',
        status_running: 'En Proceso',
        status_completed: 'Completado',
        status_failed: 'Fallido',
        status_cancelled: 'Cancelado',
        status_active: 'Activo',
        status_inactive: 'Inactivo',

        // Actions
        approve: 'Aprobar',
        reject: 'Rechazar',
        pause: 'Pausar',
        resume: 'Reanudar',
        cancel: 'Cancelar',
        retry: 'Reintentar',
        edit: 'Editar',
        delete: 'Eliminar',
        view: 'Ver',
        export: 'Exportar',
        import: 'Importar',
        refresh: 'Actualizar',
        save: 'Guardar',
        confirm: 'Confirmar',

        // User management
        user: 'Usuario',
        users: 'Usuarios',
        admin: 'Administrador',
        profile: 'Perfil',
        settings: 'Configuración',
        logout: 'Cerrar Sesión',

        // Common
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        warning: 'Advertencia',
        info: 'Información',
        search: 'Buscar',
        filter: 'Filtrar',
        sort: 'Ordenar',
        page: 'Página',
        of: 'de',
        results: 'resultados',
        no_data: 'Sin datos disponibles',
        no_results: 'No se encontraron resultados',

      },

      // Slot content (can be injected by parent components)
      slot: {},

      // Current user context (if available)
      user: {
        name: 'Usuario Administrador',
        email: 'admin@example.com',
        role: 'admin',
        avatar: '',
        authenticated: true,
        ...data.user,
      },

      // Page context
      page: {
        title: 'Panel Administrativo',
        subtitle: '',
        breadcrumb: [],
        ...data.page,
      },

      // Additional data passed as props
      ...data,
    };
  };

  /**
   * Sanitize HTML content for security
   */
  const sanitizeHTML = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOW_TAGS: [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'img', 'button', 'input', 'select', 'option', 'textarea',
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'form', 'label', 'nav', 'header', 'footer', 'section', 'article',
        'aside', 'main', 'figure', 'figcaption', 'small', 'strong', 'em',
        'br', 'hr', 'style', 'script'
      ],
      ALLOW_ATTR: [
        'style', 'class', 'id', 'href', 'src', 'alt', 'title', 'type',
        'onclick', 'onchange', 'onkeypress', 'placeholder', 'value',
        'data-*', 'role', 'aria-*'
      ],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: true
    });
  };

  /**
   * Load and process template
   */
  useEffect(() => {
    if (!templateName || !theme) {
      setError('Template name or theme not provided');
      setLoading(false);
      return;
    }

    const loadAndProcessTemplate = async () => {
      try {
        setLoading(true);
        setError('');

        const rawTemplate = await loadTemplate(templateName);
        const variables = prepareVariables();
        const processed = processTemplate(rawTemplate, variables);
        const sanitized = sanitizeHTML(processed);

        setTemplateContent(sanitized);
        onLoad?.(sanitized);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load template';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAndProcessTemplate();
  }, [templateName, themeConfig, JSON.stringify(data)]);

  /**
   * Handle template interactions (onclick events, etc.)
   */
  const handleTemplateClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // Handle onclick attributes in template
    const onclickAttr = target.getAttribute('onclick');
    if (onclickAttr) {
      event.preventDefault();

      try {
        // Safely execute the onclick code
        // In production, you'd want better security here
        const func = new Function(onclickAttr);
        func.call(target);
      } catch (err) {
        console.error('Error executing template onclick:', err);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={className} style={style}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: theme?.colors?.text_secondary || '#666'
        }}>
          <div>Cargando template...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={className} style={style}>
        <div style={{
          padding: '20px',
          border: `1px solid ${theme?.colors?.error || '#f44336'}`,
          borderRadius: '4px',
          backgroundColor: `${theme?.colors?.error || '#f44336'}20`,
          color: theme?.colors?.error || '#f44336',
        }}>
          <strong>Template Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Render template content
  return (
    <div
      className={className}
      style={style}
      onClick={handleTemplateClick}
      dangerouslySetInnerHTML={{ __html: templateContent }}
    />
  );
};

/**
 * Hook for easier template usage in admin components
 */
export const useAdminTemplate = (templateName: string, data?: Record<string, any>) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  return {
    content,
    loading,
    error,
    TemplateComponent: () => (
      <ThemeTemplateEngine
        templateName={templateName}
        data={data}
        onLoad={setContent}
        onError={setError}
      />
    ),
  };
};

export default ThemeTemplateEngine;