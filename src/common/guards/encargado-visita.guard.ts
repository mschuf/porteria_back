import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";
import { API_ERROR_CODE } from "../types/api-error-code";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { APROBACION_VISITAS_ROLES } from "../types/role-hierarchy";

@Injectable()
export class EncargadoVisitaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user || !APROBACION_VISITAS_ROLES.includes(user.role)) {
      throw new BusinessException({ message: "No tiene acceso al módulo de responsable de visitas", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
    }
    return true;
  }
}
