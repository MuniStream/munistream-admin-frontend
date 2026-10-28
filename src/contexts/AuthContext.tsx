import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import keycloakService from '@/services/keycloak';
import { highestRole, permissionsForRoles, SystemRole } from '@/auth/permissions';

// User interface matching existing system
export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  /** Highest system role, for display; null when the account has no staff role. */
  role: SystemRole | null;
  /** Every Keycloak role of the account (realm and client). */
  roles: string[];
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  permissions: string[];
  department?: string;
  phone?: string;
  avatar_url?: string;
  email_notifications: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  // Initialize Keycloak and set user
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        const authenticated = await keycloakService.init();

        if (authenticated) {
          const userInfo = keycloakService.getUserInfo();

          if (userInfo && userInfo.id) {
            // Permissions are the union over every role the account holds; a
            // user with no staff role gets none (see ProtectedRoute).
            const roles = userInfo.roles || [];
            const permissions = permissionsForRoles(roles);

            // Create user object
            const mappedUser: User = {
              id: userInfo.id,
              email: userInfo.email || '',
              username: userInfo.username || userInfo.email || '',
              full_name: userInfo.name || userInfo.username || '',
              role: highestRole(roles),
              roles,
              status: 'active',
              permissions,
              department: '',
              phone: '',
              avatar_url: '',
              email_notifications: true,
              two_factor_enabled: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_login: new Date().toISOString(),
            };

            setUser(mappedUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []); // Empty dependency array - run once

  // Login function
  const login = async (): Promise<void> => {
    await keycloakService.login();
    // This will redirect to Keycloak, so the promise won't resolve
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setUser(null);
    await keycloakService.logout();
    // This will redirect to Keycloak logout
  };

  // Update user function
  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean =>
    user?.permissions?.includes(permission) || false;

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.includes(role);
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => hasRole(role));
  };

  // Compute isAuthenticated
  const isAuthenticated = React.useMemo(
    () => keycloakService.isAuthenticated() && !!user,
    [user]
  );

  // Create context value
  const value = React.useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      updateUser,
      hasPermission,
      hasRole,
      hasAnyRole,
    }),
    [user, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;