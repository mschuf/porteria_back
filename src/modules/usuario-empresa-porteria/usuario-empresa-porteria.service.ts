/**
 * @file usuario-empresa-porteria.service.ts
 * @description Orquesta el CRUD de asignaciones usuario-empresa-porteria contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type {
  CreateUsuarioEmpresaPorteriaInput,
  UpdateUsuarioEmpresaPorteriaInput,
} from "./usuario-empresa-porteria.types";
import type { UsuarioEmpresaPorteriaResponseDto } from "./dto/usuario-empresa-porteria.response.dto";
import { CreateUsuarioEmpresaPorteriaDto } from "./dto/create-usuario-empresa-porteria.dto";
import {
  DEFAULT_USUARIO_EMPRESA_PORTERIA_PAGE_LIMIT,
  type ListUsuarioEmpresaPorteriaQueryDto,
} from "./dto/list-usuario-empresa-porteria-query.dto";
import { UpdateUsuarioEmpresaPorteriaDto } from "./dto/update-usuario-empresa-porteria.dto";
import { mapUsuarioEmpresaPorteriaRowToResponse } from "./mappers/usuario-empresa-porteria.mapper";
import { UsuarioEmpresaPorteriaSqlRepository } from "./repositories/usuario-empresa-porteria.sql-repository";
import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";

/** Servicio de gestion de asignaciones usuario-empresa-porteria con persistencia en Postgres. */
@Injectable()
export class UsuarioEmpresaPorteriaService {
  /** Inyecta el repositorio de asignaciones usuario-empresa-porteria. */
  constructor(private readonly repo: UsuarioEmpresaPorteriaSqlRepository, private readonly sedeAccess: SedeAccessService) {}

  /** Lista asignaciones usuario-empresa-porteria paginadas aplicando busqueda y filtros. */
  async list(query: ListUsuarioEmpresaPorteriaQueryDto, current?: AuthenticatedUser): Promise<PaginatedResult<UsuarioEmpresaPorteriaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_USUARIO_EMPRESA_PORTERIA_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      usuarioId: query.usuarioId,
      empresaPorteriaId: query.empresaPorteriaId,
      sedeId: query.sedeId,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      actorSedeIds: current?.role === "admin_empresa" ? await this.sedeAccess.resolveSedeIds(current) ?? [] : undefined,
      actorSecurityCompanyId: current?.role === "encargado_seguridad" || current?.role === "encargado_porteria" ? current.empresaSeguridadId ?? undefined : undefined,
      actorTargetRoles: current ? this.managedRoles(current.role) : undefined,
    });

    return {
      items: result.items.map(mapUsuarioEmpresaPorteriaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una asignacion usuario-empresa-porteria por su identificador. */
  async findById(id: number, current?: AuthenticatedUser): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
    if (current) await this.assertCanManage(current, asignacion);

    return mapUsuarioEmpresaPorteriaRowToResponse(asignacion);
  }

  /** Crea una asignacion usuario-empresa-porteria nueva. */
  async create(dto: CreateUsuarioEmpresaPorteriaDto): Promise<UsuarioEmpresaPorteriaResponseDto> {
    await this.ensureUsuarioExists(dto.usuarioId);
    await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);
    await this.ensureSedeAssignmentActive(dto.sedeEmpresaPorteriaId, dto.empresaPorteriaId);

    const activo = dto.activo ?? true;
    if (activo) {
      await this.ensureNoActiveDuplicate(dto.usuarioId);
    }

    const input: CreateUsuarioEmpresaPorteriaInput = {
      usuarioId: dto.usuarioId,
      empresaPorteriaId: dto.empresaPorteriaId,
      sedeEmpresaPorteriaId: dto.sedeEmpresaPorteriaId,
      activo,
    };

    const created = await this.repo.create(input);
    return mapUsuarioEmpresaPorteriaRowToResponse(created);
  }

  /** Actualiza parcialmente una asignacion usuario-empresa-porteria existente. */
  async update(id: number, dto: UpdateUsuarioEmpresaPorteriaDto, current?: AuthenticatedUser): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const assignment = await this.repo.findById(id);
    if (!assignment) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
    if (current) await this.assertCanManage(current, assignment);

    if (dto.usuarioId !== undefined) {
      await this.ensureUsuarioExists(dto.usuarioId);
    }
    if (dto.empresaPorteriaId !== undefined) {
      await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);
    }

    const resultingUsuarioId = dto.usuarioId ?? Number(assignment.usuario_id);
    const resultingEmpresaPorteriaId = dto.empresaPorteriaId ?? Number(assignment.empresa_seguridad_id);
    const resultingSedeEmpresaPorteriaId =
      dto.sedeEmpresaPorteriaId ?? Number(assignment.sede_empresa_seguridad_id);
    const resultingActivo = dto.activo ?? assignment.activo;

    if (current && current.role !== "super_admin") {
      if (dto.usuarioId !== undefined && dto.usuarioId !== Number(assignment.usuario_id)) throw this.forbidden();
      const targetSedeId = await this.repo.findSedeIdForAssignment(resultingSedeEmpresaPorteriaId, resultingEmpresaPorteriaId);
      if (targetSedeId == null) throw this.forbidden();
      if (current.role === "encargado_seguridad" || current.role === "encargado_porteria") {
        const allowed = await this.sedeAccess.listSecurityCompanySedeIds(current.empresaSeguridadId);
        if (resultingEmpresaPorteriaId !== current.empresaSeguridadId || !allowed.includes(targetSedeId)) throw this.forbidden();
      } else {
        await this.sedeAccess.assertSede(current, targetSedeId);
      }
    }

    if (resultingActivo) {
      await this.ensureSedeAssignmentActive(resultingSedeEmpresaPorteriaId, resultingEmpresaPorteriaId);
      await this.ensureNoActiveDuplicate(resultingUsuarioId, id);
    }

    const input: UpdateUsuarioEmpresaPorteriaInput = {};
    if (dto.usuarioId !== undefined) input.usuarioId = dto.usuarioId;
    if (dto.empresaPorteriaId !== undefined) input.empresaPorteriaId = dto.empresaPorteriaId;
    if (dto.sedeEmpresaPorteriaId !== undefined) {
      input.sedeEmpresaPorteriaId = dto.sedeEmpresaPorteriaId;
    }
    if (dto.activo !== undefined) input.activo = dto.activo;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaPorteriaRowToResponse(updated);
  }

  /** Desactiva una asignacion usuario-empresa-porteria. */
  async deactivate(id: number, current?: AuthenticatedUser): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const assignment = await this.repo.findById(id);
    if (!assignment) throw this.notFound(id);
    if (current) await this.assertCanManage(current, assignment);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaPorteriaRowToResponse(updated);
  }

  /** Reactiva una asignacion usuario-empresa-porteria. */
  async activate(id: number, actor?: AuthenticatedUser): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
    if (actor) await this.assertCanManage(actor, current);

    if (current.sede_empresa_seguridad_id == null) {
      await this.ensureEmpresaPorteriaExists(Number(current.empresa_seguridad_id));
    } else {
      await this.ensureSedeAssignmentActive(
        Number(current.sede_empresa_seguridad_id),
        Number(current.empresa_seguridad_id),
      );
    }
    await this.ensureNoActiveDuplicate(Number(current.usuario_id), id);

    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaPorteriaRowToResponse(updated);
  }

  /** Elimina permanentemente una asignacion usuario-empresa-porteria. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { id: deletedId, deleted: true };
  }

  /** Verifica que una asignacion exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  private managedRoles(role: UserRole): UserRole[] {
    if (role === "super_admin") return ["super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria", "portero"];
    if (role === "admin_empresa" || role === "encargado_seguridad") return ["encargado_porteria", "portero"];
    if (role === "encargado_porteria") return ["portero"];
    return [];
  }

  private async assertCanManage(actor: AuthenticatedUser, assignment: { empresa_seguridad_id: string; sede_id: string | null; usuario_rol: UserRole }): Promise<void> {
    if (actor.role === "super_admin") return;
    if (!this.managedRoles(actor.role).includes(assignment.usuario_rol)) throw this.forbidden();
    if (actor.role === "encargado_seguridad" || actor.role === "encargado_porteria") {
      if (Number(assignment.empresa_seguridad_id) !== actor.empresaSeguridadId) throw this.forbidden();
      return;
    }
    const allowedSedes = await this.sedeAccess.resolveSedeIds(actor) ?? [];
    if (assignment.sede_id == null || !allowedSedes.includes(Number(assignment.sede_id))) throw this.forbidden();
  }

  private notFound(id: number): BusinessException {
    return new BusinessException({ message: `Asignacion usuario-empresa-porteria ${id} not found`, code: API_ERROR_CODE.NOT_FOUND, status: HttpStatus.NOT_FOUND });
  }

  private forbidden(): BusinessException {
    return new BusinessException({ message: "No tiene permiso para administrar esta asignacion", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN });
  }

  /** Verifica que el usuario referenciado exista. */
  private async ensureUsuarioExists(usuarioId: number): Promise<void> {
    const exists = await this.repo.usuarioExists(usuarioId);
    if (!exists) {
      throw new BusinessException({
        message: `Usuario ${usuarioId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que la empresa de seguridad referenciada exista. */
  private async ensureEmpresaPorteriaExists(empresaPorteriaId: number): Promise<void> {
    const exists = await this.repo.empresaPorteriaExists(empresaPorteriaId);
    if (!exists) {
      throw new BusinessException({
        message: `Empresa de seguridad ${empresaPorteriaId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que no exista ya otra asignacion activa para el mismo par usuario-empresa_porteria. */
  private async ensureNoActiveDuplicate(
    usuarioId: number,
    excludeId?: number,
  ): Promise<void> {
    const existingId = await this.repo.findActiveDuplicate(usuarioId, excludeId);
    if (existingId != null) {
      throw new BusinessException({
        message: `El usuario ${usuarioId} ya tiene una asignación activa de portería`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }

  /** Verifica que la sede elegida corresponda a una asignación activa de la empresa. */
  private async ensureSedeAssignmentActive(
    sedeEmpresaPorteriaId: number,
    empresaPorteriaId: number,
  ): Promise<void> {
    const valid = await this.repo.sedeAssignmentIsActive(sedeEmpresaPorteriaId, empresaPorteriaId);
    if (!valid) {
      throw new BusinessException({
        message: "La sede no corresponde a una asignación activa y vigente de la empresa de portería",
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }
}
