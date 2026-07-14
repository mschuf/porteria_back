/**
 * @file super-admin.guard.ts
 * @description Guard para endpoints administrativos con roles locales.
 */
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SUPER_ADMIN_KEY } from "../decorators/super-admin.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { BusinessException } from "../exceptions/business.exception";
import { API_ERROR_CODE } from "../types/api-error-code";

const ADMIN_ROLES = new Set<AuthenticatedUser["role"]>([
  "super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria",
]);

/** Verifica permisos administrativos cuando el handler lo exige. */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  /** Inyecta reflector para leer metadatos de administración. */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Permite el acceso si no se requiere admin o si el usuario tiene rol administrativo.
   * @param context - Contexto de ejecución HTTP.
   * @returns `true` si el acceso está autorizado.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean | undefined>(
      SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresSuperAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new BusinessException({
        message: "Authentication required",
        code: API_ERROR_CODE.AUTH_REQUIRED,
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!ADMIN_ROLES.has(user.role)) {
      throw new BusinessException({
        message: "You do not have permission to access this resource",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }

    return true;
  }
}
