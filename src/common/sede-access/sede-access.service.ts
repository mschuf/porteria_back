import { HttpStatus, Injectable } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";
import { API_ERROR_CODE } from "../types/api-error-code";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { PostgresService } from "../../modules/postgres/postgres.service";

export interface AuthorizedSede {
  id: number;
  nombre: string;
  empresaId: number;
  empresaNombre: string;
}

/** Fuente unica de verdad para el alcance territorial de la sesion. */
@Injectable()
export class SedeAccessService {
  constructor(private readonly postgres: PostgresService) {}

  /** `undefined` representa acceso global; un arreglo vacio representa acceso sin sedes. */
  async resolveSedeIds(user: AuthenticatedUser): Promise<number[] | undefined> {
    if (user.role === "super_admin") return undefined;
    if (user.role === "portero" || user.role === "encargado_porteria") return user.sedeId ? [user.sedeId] : [];
    if (user.role === "encargado_seguridad") return [];
    return (await this.listAuthorizedSedes(user.id)).map((sede) => sede.id);
  }

  /** Sedes activas atendidas actualmente por una empresa de seguridad. */
  async listSecurityCompanySedeIds(empresaSeguridadId: number | null): Promise<number[]> {
    if (empresaSeguridadId == null) return [];
    const rows = await this.postgres.query<{ sede_id: string }>(
      `SELECT DISTINCT sep.sede_id
       FROM public.sede_empresa_seguridad sep
       JOIN public.sede s ON s.id = sep.sede_id AND s.activo = true
       JOIN public.empresa e ON e.id = s.empresa_id AND e.activo = true
       JOIN public.empresa_seguridad es ON es.id = sep.empresa_seguridad_id AND es.activo = true
       WHERE sep.empresa_seguridad_id = $1 AND sep.activo = true
         AND sep.asignado_desde <= now()
         AND (sep.asignado_hasta IS NULL OR sep.asignado_hasta >= now())`,
      [empresaSeguridadId],
    );
    return rows.map((row) => Number(row.sede_id));
  }

  async resolveCardSedeIds(user: AuthenticatedUser): Promise<number[] | undefined> {
    if (user.role === "encargado_seguridad") return this.listSecurityCompanySedeIds(user.empresaSeguridadId);
    return this.resolveSedeIds(user);
  }

  async resolveReportSedeIds(user: AuthenticatedUser): Promise<number[] | undefined> {
    if (user.role === "encargado_seguridad" || user.role === "encargado_porteria") {
      return this.listSecurityCompanySedeIds(user.empresaSeguridadId);
    }
    return this.resolveSedeIds(user);
  }

  async assertCardSede(user: AuthenticatedUser, sedeId: number): Promise<void> {
    const scope = await this.resolveCardSedeIds(user);
    if (scope !== undefined && !scope.includes(sedeId)) throw this.forbiddenSede();
  }

  async listAuthorizedSedes(userId: number): Promise<AuthorizedSede[]> {
    const rows = await this.postgres.query<{
      id: string; nombre: string; empresa_id: string; empresa_nombre: string;
    }>(
      `SELECT s.id, s.nombre, e.id AS empresa_id, e.nombre AS empresa_nombre
       FROM public.usuario_sede us
       INNER JOIN public.usuario u ON u.id = us.usuario_id AND u.activo = true AND u.rol IN ('admin_empresa', 'encargado_visita')
       INNER JOIN public.sede s ON s.id = us.sede_id AND s.activo = true
       INNER JOIN public.empresa e ON e.id = s.empresa_id AND e.activo = true
       WHERE us.usuario_id = $1 AND us.activo = true
       ORDER BY s.nombre, s.id`,
      [userId],
    );
    return rows.map((row) => ({
      id: Number(row.id), nombre: row.nombre, empresaId: Number(row.empresa_id), empresaNombre: row.empresa_nombre,
    }));
  }

  async assertSede(user: AuthenticatedUser, sedeId: number): Promise<void> {
    const scope = await this.resolveSedeIds(user);
    if (scope !== undefined && !scope.includes(sedeId)) {
      throw new BusinessException({
        message: "La sede no pertenece al alcance del usuario",
        code: API_ERROR_CODE.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
      });
    }
  }

  private forbiddenSede(): BusinessException {
    return new BusinessException({ message: "La sede no pertenece al alcance del usuario", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
  }
}
