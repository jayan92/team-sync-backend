import { UnauthorizedException } from "./appError";
import { RolePermissions } from "./role-permission";
import { PermissionType, Permissions } from "./../enums/role.enum";

export const roleGuard = (
  role: keyof typeof RolePermissions,
  requiredPermissions: PermissionType[]
) => {
  const permissions = RolePermissions[role];

  const hasPermission = requiredPermissions.every((permission) =>
    permissions.includes(permission)
  );

  if (!hasPermission) {
    throw new UnauthorizedException(
      "You do not have the required permission to perform this action."
    );
  }

  // Explicitly return true for clarity
  return true;
};
