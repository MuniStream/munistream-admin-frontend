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
  instanceAssignments: string;
  
  // Instance Assignments
  instance_assignments: string;
  my_assignments: string;
  team_assignments: string;
  assignment_status: string;
  assigned_to: string;
  assigned_at: string;
  unassigned: string;
  assigned: string;
  in_progress: string;
  completed: string;
  escalated: string;
  on_hold: string;
  assign_to_user: string;
  assign_to_team: string;
  start_work: string;
  complete: string;
  complete_assignment: string;
  unassign: string;
  assignment_notes: string;
  completion_notes: string;
  completion_notes_help: string;
  select_user: string;
  select_team: string;
  assign: string;
  more_actions: string;
  instance_id: string;
  citizen: string;
  team: string;
  members: string;
  
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

  // Admin form fields
  userIdPlaceholder: string;
  requiresCitizenInfo: string;
  critical: string;
  confirm: string;
  override: string;
  validationComments: string;
  privateKeyPassword: string;
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
  instanceAssignments: 'Asignaciones de Instancias',
  
  // Instance Assignments
  instance_assignments: 'Asignaciones de Instancias',
  my_assignments: 'Mis Asignaciones',
  team_assignments: 'Asignaciones de Equipo',
  assignment_status: 'Estado de Asignación',
  assigned_to: 'Asignado a',
  assigned_at: 'Asignado en',
  unassigned: 'Sin Asignar',
  assigned: 'Asignado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  escalated: 'Escalado',
  on_hold: 'En Espera',
  assign_to_user: 'Asignar a Usuario',
  assign_to_team: 'Asignar a Equipo',
  start_work: 'Iniciar Trabajo',
  complete: 'Completar',
  complete_assignment: 'Completar Asignación',
  unassign: 'Desasignar',
  assignment_notes: 'Notas de Asignación',
  completion_notes: 'Notas de Finalización',
  completion_notes_help: 'Añade notas sobre el trabajo realizado o resolución del caso',
  select_user: 'Seleccionar Usuario',
  select_team: 'Seleccionar Equipo',
  assign: 'Asignar',
  more_actions: 'Más Acciones',
  instance_id: 'ID de Instancia',
  citizen: 'Ciudadano',
  team: 'Equipo',
  members: 'miembros',

  // Admin form fields
  userIdPlaceholder: 'ID del usuario',
  requiresCitizenInfo: 'Requiere Info Ciudadano',
  critical: 'Crítico',
  confirm: 'Confirmar',
  override: 'Sobreescribir',
  validationComments: 'Comentarios de Validación',
  privateKeyPassword: 'Contraseña de la llave privada',
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
  instanceAssignments: 'Instance Assignments',
  
  // Instance Assignments
  instance_assignments: 'Instance Assignments',
  my_assignments: 'My Assignments',
  team_assignments: 'Team Assignments',
  assignment_status: 'Assignment Status',
  assigned_to: 'Assigned to',
  assigned_at: 'Assigned at',
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  escalated: 'Escalated',
  on_hold: 'On Hold',
  assign_to_user: 'Assign to User',
  assign_to_team: 'Assign to Team',
  start_work: 'Start Work',
  complete: 'Complete',
  complete_assignment: 'Complete Assignment',
  unassign: 'Unassign',
  assignment_notes: 'Assignment Notes',
  completion_notes: 'Completion Notes',
  completion_notes_help: 'Add notes about the work performed or case resolution',
  select_user: 'Select User',
  select_team: 'Select Team',
  assign: 'Assign',
  more_actions: 'More Actions',
  instance_id: 'Instance ID',
  citizen: 'Citizen',
  team: 'Team',
  members: 'members',
  
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

  // Admin form fields
  userIdPlaceholder: 'User ID',
  requiresCitizenInfo: 'Requires Citizen Info',
  critical: 'Critical',
  confirm: 'Confirm',
  override: 'Override',
  validationComments: 'Validation Comments',
  privateKeyPassword: 'Private key password',
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