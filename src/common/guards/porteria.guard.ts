/**
 * @file porteria.guard.ts
 * @description Guard que restringe endpoints del módulo Portería a usuarios con rol portero.
 */
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { BusinessException } from "../exceptions/business.exception";
import { API_ERROR_CODE } from "../types/api-error-code";

const PORTERIA_ROLES = new Set<AuthenticatedUser["role"]>([
  "super_admin", "admin_empresa", "encargado_porteria", "portero",
]);

/** Verifica rol local autorizado antes de permitir el acceso. */
@Injectable()
export class PorteriaGuard implements CanActivate {
  /**
   * Permite el acceso solo si el usuario autenticado tiene rol autorizado para Porteria.
   * @param context - Contexto de ejecución HTTP.
   * @returns `true` si el acceso está autorizado.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new BusinessException({
        message: "Authentication required",
        code: API_ERROR_CODE.AUTH_REQUIRED,
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!PORTERIA_ROLES.has(user.role)) {
      throw new BusinessException({
        message: "You do not have permission to access this resource",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }

    return true;
  }
}
