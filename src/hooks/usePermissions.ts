import { useMemo } from 'react';

interface AppSettings {
  module_permissions: Record<string, Record<string, string[]>> | null;
}

type UserRole = 'client' | 'worker' | 'administrator' | null;

export const usePermissions = (appSettings: AppSettings | null, currentUserRole: UserRole) => {
  const permissions = useMemo(() => {
    if (!appSettings?.module_permissions || !currentUserRole) {
      return null;
    }
    return appSettings.module_permissions;
  }, [appSettings, currentUserRole]);

  const checkPermission = (moduleName: string, action: string): boolean => {
    if (!permissions || !currentUserRole) {
      return false;
    }

    // Administrators always have full access
    if (currentUserRole === 'administrator') {
      return true;
    }

    const modulePermissions = permissions[moduleName];
    if (!modulePermissions) {
      return false; // Module not defined in permissions
    }

    const allowedRoles = modulePermissions[action];
    if (!allowedRoles) {
      return false; // Action not defined for this module
    }

    return allowedRoles.includes(currentUserRole);
  };

  const canViewModule = (moduleName: string): boolean => checkPermission(moduleName, 'view');
  const canCreate = (moduleName: string): boolean => checkPermission(moduleName, 'create');
  const canEdit = (moduleName: string): boolean => checkPermission(moduleName, 'edit');
  const canDelete = (moduleName: string): boolean => checkPermission(moduleName, 'delete');
  const canSendMessage = (moduleName: string): boolean => checkPermission(moduleName, 'send_message'); // Specific for chat

  return {
    canViewModule,
    canCreate,
    canEdit,
    canDelete,
    canSendMessage,
    currentUserRole, // Expose current user role for other checks if needed
  };
};