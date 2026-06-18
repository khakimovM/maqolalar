import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Minimal talab qilinadigan rol. Ierarxik ishlaydi:
 * @Roles(Role.ADMIN) → ADMIN va SUPERADMIN kira oladi.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
