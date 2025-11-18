import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Team Administration
      'team_administration': 'Team Administration',
      'create_team': 'Create Team',
      'edit_team': 'Edit Team',
      'delete_team': 'Delete Team',
      'sync_to_keycloak': 'Sync to Keycloak',
      'team_id': 'Team ID',
      'team_name': 'Team Name',
      'description': 'Description',
      'department': 'Department',
      'max_concurrent_tasks': 'Max Concurrent Tasks',
      'specializations': 'Specializations',
      'members': 'Members',
      'managers': 'Managers',
      'workflows': 'Workflows',
      'status': 'Status',
      'actions': 'Actions',
      'active': 'Active',
      'inactive': 'Inactive',
      'manage_members': 'Manage Members',
      'add_members': 'Add New Members',
      'current_members': 'Current Members',
      'make_manager': 'Make Manager',
      'remove_manager': 'Remove Manager',
      'remove': 'Remove',
      'add': 'Add',
      'role': 'Role',
      'member': 'Member',
      'reviewer': 'Reviewer',
      'approver': 'Approver',
      'cancel': 'Cancel',
      'create': 'Create',
      'update': 'Update',
      'close': 'Close',

      // User Administration
      'user_administration': 'User Administration',
      'search_users': 'Search users',
      'all_roles': 'All Roles',
      'all_statuses': 'All Statuses',
      'all_teams': 'All Teams',
      'change_role': 'Change Role',
      'assign_teams': 'Assign Teams',
      'sync_from_keycloak': 'Sync from Keycloak',
      'full_name': 'Full Name',
      'email': 'Email',
      'username': 'Username',
      'teams': 'Teams',
      'last_login': 'Last Login',

      // Common
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'name': 'Name',
      'search': 'Search',
      'filter': 'Filter',
      'save': 'Save',
      'edit': 'Edit',
      'delete': 'Delete',
    }
  },
  es: {
    translation: {
      // Team Administration
      'team_administration': 'Administración de Equipos',
      'create_team': 'Crear Equipo',
      'edit_team': 'Editar Equipo',
      'delete_team': 'Eliminar Equipo',
      'sync_to_keycloak': 'Sincronizar con Keycloak',
      'team_id': 'ID del Equipo',
      'team_name': 'Nombre del Equipo',
      'description': 'Descripción',
      'department': 'Departamento',
      'max_concurrent_tasks': 'Máx. Tareas Concurrentes',
      'specializations': 'Especializaciones',
      'members': 'Miembros',
      'managers': 'Administradores',
      'workflows': 'Flujos de Trabajo',
      'status': 'Estado',
      'actions': 'Acciones',
      'active': 'Activo',
      'inactive': 'Inactivo',
      'manage_members': 'Administrar Miembros',
      'add_members': 'Agregar Nuevos Miembros',
      'current_members': 'Miembros Actuales',
      'make_manager': 'Hacer Administrador',
      'remove_manager': 'Quitar Administrador',
      'remove': 'Quitar',
      'add': 'Agregar',
      'role': 'Rol',
      'member': 'Miembro',
      'reviewer': 'Revisor',
      'approver': 'Aprobador',
      'cancel': 'Cancelar',
      'create': 'Crear',
      'update': 'Actualizar',
      'close': 'Cerrar',

      // User Administration
      'user_administration': 'Administración de Usuarios',
      'search_users': 'Buscar usuarios',
      'all_roles': 'Todos los Roles',
      'all_statuses': 'Todos los Estados',
      'all_teams': 'Todos los Equipos',
      'change_role': 'Cambiar Rol',
      'assign_teams': 'Asignar Equipos',
      'sync_from_keycloak': 'Sincronizar desde Keycloak',
      'full_name': 'Nombre Completo',
      'email': 'Correo Electrónico',
      'username': 'Nombre de Usuario',
      'teams': 'Equipos',
      'last_login': 'Último Inicio de Sesión',

      // Common
      'loading': 'Cargando...',
      'error': 'Error',
      'success': 'Éxito',
      'name': 'Nombre',
      'search': 'Buscar',
      'filter': 'Filtrar',
      'save': 'Guardar',
      'edit': 'Editar',
      'delete': 'Eliminar',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // Default to Spanish
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;