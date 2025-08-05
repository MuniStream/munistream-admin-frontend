import React, { createContext, useContext, useState, ReactNode } from 'react';

// Supported languages
export type Language = 'es' | 'en';

// Translation keys structure
interface Translations {
  // Common
  search: string;
  clear: string;
  loading: string;
  error: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  update: string;
  close: string;
  
  // Navigation
  dashboard: string;
  workflows: string;
  instances: string;
  citizenTracking: string;
  citizenValidation: string;
  adminInbox: string;
  documents: string;
  analytics: string;
  categories: string;
  
  // Citizen Tracking
  searchInstanceId: string;
  instanceIdPlaceholder: string;
  status: string;
  workflow: string;
  allStatuses: string;
  allWorkflows: string;
  advancedFilters: string;
  citizenRequests: string;
  instanceId: string;
  user: string;
  created: string;
  updated: string;
  actions: string;
  viewDetails: string;
  refresh: string;
  page: string;
  of: string;
  total: string;
  
  // Status labels
  statusPending: string;
  statusRunning: string;
  statusAwaitingInput: string;
  statusPendingValidation: string;
  statusCompleted: string;
  statusFailed: string;
  statusCancelled: string;
  statusPaused: string;
  
  // Filters
  filterByWorkflow: string;
  filterByUser: string;
  filterByStatus: string;
  createdFrom: string;
  createdTo: string;
  dateFilters: string;
  filterTip: string;
  
  // Messages
  noRequestsFound: string;
  noRequestsAvailable: string;
  loadingRequests: string;
  
  // Categories
  categoryManagement: string;
  createCategory: string;
  editCategory: string;
  categoryName: string;
  categoryDescription: string;
  categoryColor: string;
  categoryIcon: string;
  assignedWorkflows: string;
}

// Spanish translations
const esTranslations: Translations = {
  // Common
  search: 'Buscar',
  clear: 'Limpiar',
  loading: 'Cargando...',
  error: 'Error',
  save: 'Guardar',
  cancel: 'Cancelar',
  delete: 'Eliminar',
  edit: 'Editar',
  create: 'Crear',
  update: 'Actualizar',
  close: 'Cerrar',
  
  // Navigation
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  instances: 'Instancias',
  citizenTracking: 'Seguimiento Ciudadano',
  citizenValidation: 'Validación Ciudadana',
  adminInbox: 'Bandeja Admin',
  documents: 'Documentos',
  analytics: 'Analíticas', 
  categories: 'Categorías',
  
  // Citizen Tracking
  searchInstanceId: 'Buscar por ID de Instancia',
  instanceIdPlaceholder: 'bc616c73 o ID completo',
  status: 'Estado',
  workflow: 'Workflow',
  allStatuses: 'Todos',
  allWorkflows: 'Todos los Workflows',
  advancedFilters: 'Filtros Avanzados',
  citizenRequests: 'Solicitudes Ciudadanas',
  instanceId: 'ID Instancia',
  user: 'Usuario',
  created: 'Creado',
  updated: 'Actualizado',
  actions: 'Acciones',
  viewDetails: 'Ver Detalles',
  refresh: 'Actualizar',
  page: 'Página',
  of: 'de',
  total: 'total',
  
  // Status labels
  statusPending: 'Pendiente',
  statusRunning: 'Ejecutándose',
  statusAwaitingInput: 'Esperando Información',
  statusPendingValidation: 'Pendiente Validación',
  statusCompleted: 'Completado',
  statusFailed: 'Fallido',
  statusCancelled: 'Cancelado',
  statusPaused: 'Pausado',
  
  // Filters
  filterByWorkflow: 'Filtrar por Workflow',
  filterByUser: 'Usuario/Ciudadano',
  filterByStatus: 'Filtrar por Estado',
  createdFrom: 'Creado Desde',
  createdTo: 'Creado Hasta',
  dateFilters: '🗓️ Filtros de Fecha',
  filterTip: '💡 Tip: Usa filtros específicos para búsquedas más rápidas',
  
  // Messages
  noRequestsFound: 'No se encontraron solicitudes con los filtros aplicados',
  noRequestsAvailable: 'No hay solicitudes disponibles',
  loadingRequests: 'Cargando solicitudes...',
  
  // Categories
  categoryManagement: 'Gestión de Categorías',
  createCategory: 'Crear Categoría',
  editCategory: 'Editar Categoría',
  categoryName: 'Nombre de Categoría',
  categoryDescription: 'Descripción',
  categoryColor: 'Color',
  categoryIcon: 'Icono',
  assignedWorkflows: 'Workflows Asignados',
};

// English translations
const enTranslations: Translations = {
  // Common
  search: 'Search',
  clear: 'Clear',
  loading: 'Loading...',
  error: 'Error',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  update: 'Update',
  close: 'Close',
  
  // Navigation
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  instances: 'Instances',
  citizenTracking: 'Citizen Tracking',
  citizenValidation: 'Citizen Validation',
  adminInbox: 'Admin Inbox',
  documents: 'Documents',
  analytics: 'Analytics',
  categories: 'Categories',
  
  // Citizen Tracking
  searchInstanceId: 'Search by Instance ID',
  instanceIdPlaceholder: 'bc616c73 or complete ID',
  status: 'Status',
  workflow: 'Workflow',
  allStatuses: 'All',
  allWorkflows: 'All Workflows',
  advancedFilters: 'Advanced Filters',
  citizenRequests: 'Citizen Requests',
  instanceId: 'Instance ID',
  user: 'User',
  created: 'Created',
  updated: 'Updated',
  actions: 'Actions',
  viewDetails: 'View Details',
  refresh: 'Refresh',
  page: 'Page',
  of: 'of',
  total: 'total',
  
  // Status labels
  statusPending: 'Pending',
  statusRunning: 'Running',
  statusAwaitingInput: 'Awaiting Input',
  statusPendingValidation: 'Pending Validation',
  statusCompleted: 'Completed',
  statusFailed: 'Failed',
  statusCancelled: 'Cancelled',
  statusPaused: 'Paused',
  
  // Filters
  filterByWorkflow: 'Filter by Workflow',
  filterByUser: 'User/Citizen',
  filterByStatus: 'Filter by Status',
  createdFrom: 'Created From',
  createdTo: 'Created To',
  dateFilters: '🗓️ Date Filters',
  filterTip: '💡 Tip: Use specific filters for faster searches',
  
  // Messages
  noRequestsFound: 'No requests found with applied filters',
  noRequestsAvailable: 'No requests available',
  loadingRequests: 'Loading requests...',
  
  // Categories
  categoryManagement: 'Category Management',
  createCategory: 'Create Category',
  editCategory: 'Edit Category',
  categoryName: 'Category Name',
  categoryDescription: 'Description',
  categoryColor: 'Color',
  categoryIcon: 'Icon',
  assignedWorkflows: 'Assigned Workflows',
};

const translations = {
  es: esTranslations,
  en: enTranslations,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
  translations: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');
  
  const t = (key: keyof Translations): string => {
    return translations[language][key] || key;
  };
  
  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    translations: translations[language],
  };
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};