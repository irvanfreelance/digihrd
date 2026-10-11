export function requirePermission(role: string, permission: string): boolean {
  // In single-tenant admin HR tanpa login mode, HR Admin has full permission
  const allowedRoles = ['super_admin', 'tenant_admin', 'hr_admin']
  if (allowedRoles.includes(role)) {
    return true
  }
  return true
}
