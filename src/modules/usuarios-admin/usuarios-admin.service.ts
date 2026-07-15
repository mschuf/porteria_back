/**
 * @file usuarios-admin.service.ts
 * @description Orquesta el CRUD de usuarios contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser, UserRole } from "../../common/types/authenticated-user";
import { getManagedRoles } from "../../common/types/role-hierarchy";
import type { CreateUsuarioAdminInput, UpdateUsuarioAdminInput } from "./usuarios-admin.types";
import type { UsuarioAdminResponseDto } from "./dto/usuario-admin.response.dto";
import type {
  UsuarioAdminAsignacionResponseDto,
  UsuarioAsignacionUsuarioDto,
} from "./dto/usuario-admin-asignacion.response.dto";
import { CreateUsuarioAdminDto } from "./dto/create-usuario-admin.dto";
import {
  DEFAULT_USUARIOS_ADMIN_PAGE_LIMIT,
  type ListUsuariosAdminQueryDto,
} from "./dto/list-usuarios-admin-query.dto";
import { UpdateUsuarioAdminDto } from "./dto/update-usuario-admin.dto";
import { mapUsuarioAdminRowToResponse } from "./mappers/usuario-admin.mapper";
import { UsuariosAdminSqlRepository } from "./repositories/usuarios-admin.sql-repository";
import { SedeAccessService } from "../../common/sede-access/sede-access.service";

const BCRYPT_SALT_ROUNDS = 10;

/** Servicio de gestion de usuarios con persistencia en Postgres. */
@Injectable()
export class UsuariosAdminService {
  /** Inyecta el repositorio de usuarios. */
  constructor(
    private readonly repo: UsuariosAdminSqlRepository,
    private readonly sedeAccess: SedeAccessService,
  ) {}

  /** Lista usuarios paginados aplicando busqueda y filtros. */
  async list(query: ListUsuariosAdminQueryDto, current?: AuthenticatedUser): Promise<PaginatedResult<UsuarioAdminResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_USUARIOS_ADMIN_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      usuario: query.usuario,
      nombre: query.nombre,
      correo: query.correo,
      rol: query.rol,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      actorSedeIds: current?.role === "admin_empresa" ? (await this.sedeAccess.resolveSedeIds(current) ?? []) : undefined,
      actorSecurityCompanyId: current?.role === "encargado_seguridad" || current?.role === "encargado_porteria"
        ? current.empresaSeguridadId ?? undefined : undefined,
      actorTargetRoles: current ? this.managedRoles(current.role) : undefined,
    });

    return {
      items: result.items.map(mapUsuarioAdminRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene un usuario por su identificador. */
  async findById(id: number, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(usuario);
  }

  /** Explica las relaciones vigentes que determinan el acceso del usuario según su rol. */
  async explainAssignment(id: number, current?: AuthenticatedUser): Promise<UsuarioAdminAsignacionResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw this.notFound(id);
    }

    const usuarioDto: UsuarioAsignacionUsuarioDto = {
      id: Number(usuario.id),
      usuario: usuario.usuario,
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo,
    };

    if (usuario.rol === "super_admin") {
      return { tipo: "global", usuario: usuarioDto };
    }

    if (usuario.rol === "admin_empresa" || usuario.rol === "encargado_visita") {
      const sedes = await this.sedeAccess.listAuthorizedSedes(id);
      return {
        tipo: "sedes",
        usuario: usuarioDto,
        empresa: sedes[0] ? { id: sedes[0].empresaId, nombre: sedes[0].empresaNombre } : null,
        sedes: sedes.map((sede) => ({ id: sede.id, nombre: sede.nombre })),
      };
    }

    const asignacion = await this.repo.findActivePorteriaAssignment(id);
    return {
      tipo: "porteria",
      usuario: usuarioDto,
      asignacion: asignacion
        ? {
            empresaPorteria: {
              id: Number(asignacion.empresa_seguridad_id),
              nombre: asignacion.empresa_porteria_nombre,
            },
            sede: asignacion.sede_id == null ? null : {
              id: Number(asignacion.sede_id),
              nombre: asignacion.sede_nombre!,
            },
            empresa: asignacion.empresa_id == null ? null : {
              id: Number(asignacion.empresa_id),
              nombre: asignacion.empresa_nombre!,
            },
          }
        : null,
    };
  }

  /** Define el conjunto completo de sedes de un administrador. */
  async replaceSedes(id: number, sedeIds: number[], current?: AuthenticatedUser): Promise<void> {
    if (current) await this.assertActorCanManage(current, id);
    const usuario = await this.repo.findById(id);
    if (!usuario) throw this.notFound(id);
    if (usuario.rol !== "admin_empresa" && usuario.rol !== "encargado_visita") {
      throw new BusinessException({ message: "El rol no admite asignación de sedes", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (usuario.rol === "encargado_visita" && sedeIds.length === 0) {
      throw new BusinessException({ message: "El encargado de visita requiere al menos una sede", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    const companies = await this.repo.findSedeCompanyIds(sedeIds);
    if (companies.size !== (sedeIds.length ? 1 : 0) || companies.missing) {
      throw new BusinessException({ message: "Las sedes deben existir, estar activas y pertenecer a la misma empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (current?.role === "admin_empresa") {
      const allowed = await this.sedeAccess.resolveSedeIds(current) ?? [];
      if (sedeIds.some((sedeId) => !allowed.includes(sedeId))) throw this.forbidden();
    }
    await this.repo.replaceActiveSedes(id, sedeIds);
  }

  async listPorteriaCandidates(current: AuthenticatedUser, search?: string) {
    const scope = current.role === "encargado_seguridad" || current.role === "encargado_porteria"
      ? await this.sedeAccess.listSecurityCompanySedeIds(current.empresaSeguridadId)
      : await this.sedeAccess.resolveSedeIds(current);
    const rows = await this.repo.findPorteriaCandidates(scope, search);
    return rows.map((r) => ({ id:Number(r.id), empresaPorteriaId:Number(r.empresa_seguridad_id), sedeId:Number(r.sede_id), label:`${r.sede_nombre} — ${r.empresa_porteria_nombre}` }));
  }

  /** Crea un usuario nuevo con contraseña hasheada. */
  async create(dto: CreateUsuarioAdminDto, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current && !this.managedRoles(current.role).includes(dto.rol)) throw this.forbidden();
    const isSiteSecurityRole = dto.rol === "portero" || dto.rol === "encargado_porteria";
    const isCompanySecurityRole = dto.rol === "encargado_seguridad";
    if ((isSiteSecurityRole || isCompanySecurityRole) && !dto.porteriaAssignment) {
      throw new BusinessException({ message: "La asignacion de empresa de seguridad es obligatoria", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (dto.porteriaAssignment && !isSiteSecurityRole && !isCompanySecurityRole) {
      throw new BusinessException({ message: "La asignacion solo corresponde a roles de seguridad", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (isSiteSecurityRole && dto.porteriaAssignment?.sedeEmpresaPorteriaId == null) {
      throw new BusinessException({ message: "La sede es obligatoria para este rol", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (isCompanySecurityRole && dto.porteriaAssignment?.sedeEmpresaPorteriaId != null) {
      throw new BusinessException({ message: "encargado_seguridad se asigna a una empresa sin sede operativa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (dto.sedeIds !== undefined && dto.rol !== "admin_empresa" && dto.rol !== "encargado_visita") {
      throw new BusinessException({ message: "Las sedes solo corresponden a roles de empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (dto.rol === "encargado_visita" && !dto.sedeIds?.length) {
      throw new BusinessException({ message: "El encargado de visita requiere al menos una sede", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    const usuario = dto.usuario.trim();
    const nombre = dto.nombre.trim();
    const correo = normalizeOptionalText(dto.correo);
    await this.ensureUniqueUsuario(usuario);

    const contrasenaHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const input: CreateUsuarioAdminInput = {
      usuario,
      nombre,
      correo,
      rol: dto.rol,
      activo: dto.activo ?? true,
      contrasenaHash,
    };

    let created;
    if (dto.sedeIds !== undefined) {
      const companies = await this.repo.findSedeCompanyIds(dto.sedeIds);
      if (companies.size !== (dto.sedeIds.length ? 1 : 0) || companies.missing) {
        throw new BusinessException({ message: "Las sedes deben existir, estar activas y pertenecer a la misma empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
      }
      if (current?.role === "admin_empresa") {
        const allowed = await this.sedeAccess.resolveSedeIds(current) ?? [];
        if (dto.sedeIds.some((id) => !allowed.includes(id))) throw this.forbidden();
      }
      created = await this.repo.createWithSedes(input, dto.sedeIds);
    } else if (dto.porteriaAssignment) {
      await this.assertAssignmentTarget(current, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId);
      created = await this.repo.createWithPorteriaAssignment(input, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId ?? null);
    } else created = await this.repo.create(input);
    return mapUsuarioAdminRowToResponse(created);
  }

  /** Actualiza parcialmente un usuario existente. */
  async update(id: number, dto: UpdateUsuarioAdminDto, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    const existing = await this.repo.findById(id);
    if (!existing) throw this.notFound(id);
    if (current?.role !== "super_admin" && dto.rol !== undefined && dto.rol !== existing.rol) throw this.forbidden();
    const resultingRole = dto.rol ?? existing.rol;
    const siteRole = resultingRole === "portero" || resultingRole === "encargado_porteria";
    const companyRole = resultingRole === "encargado_seguridad";
    if (dto.porteriaAssignment && !siteRole && !companyRole) throw this.forbidden();
    if (siteRole && dto.porteriaAssignment && dto.porteriaAssignment.sedeEmpresaPorteriaId == null) throw this.forbidden();
    if (companyRole && dto.porteriaAssignment?.sedeEmpresaPorteriaId != null) throw this.forbidden();

    const usuario = dto.usuario !== undefined ? dto.usuario.trim() : undefined;
    if (usuario !== undefined) {
      await this.ensureUniqueUsuario(usuario, id);
    }

    const input: UpdateUsuarioAdminInput = {};
    if (usuario !== undefined) input.usuario = usuario;
    if (dto.nombre !== undefined) input.nombre = dto.nombre.trim();
    if (dto.correo !== undefined) input.correo = normalizeOptionalText(dto.correo);
    if (dto.rol !== undefined) input.rol = dto.rol;
    if (dto.activo !== undefined) input.activo = dto.activo;

    let updated;
    if (dto.porteriaAssignment) {
      await this.assertAssignmentTarget(current, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId);
      updated = await this.repo.updateWithPorteriaAssignment(id, input, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId ?? null);
    } else {
      updated = await this.repo.update(id, input);
    }
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Restablece la contraseña de un usuario existente. */
  async resetPassword(id: number, password: string, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    await this.ensureExists(id);

    const contrasenaHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const updated = await this.repo.updatePassword(id, contrasenaHash);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Desactiva un usuario. Rechaza que el usuario autenticado se desactive a si mismo. */
  async deactivate(id: number, current: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (id === current.id) {
      throw new BusinessException({
        message: "No puede desactivar su propio usuario",
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    await this.assertActorCanManage(current, id);

    await this.ensureExists(id);
    const updated = await this.repo.setActivo(id, false);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Reactiva un usuario. */
  async activate(id: number, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    await this.ensureExists(id);
    const updated = await this.repo.setActivo(id, true);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Verifica que un usuario exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw this.notFound(id);
    }
  }

  /** Verifica unicidad del login antes de crear o renombrar un usuario. */
  private async ensureUniqueUsuario(usuario: string, currentId?: number): Promise<void> {
    const existing = await this.repo.findByUsuario(usuario);
    if (existing && Number(existing.id) !== currentId) {
      throw new BusinessException({
        message: `Ya existe un usuario con login ${usuario}`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }

  private notFound(id: number): BusinessException {
    return new BusinessException({
      message: `Usuario ${id} not found`,
      code: API_ERROR_CODE.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  }

  private async assertActorCanManage(current: AuthenticatedUser, targetId: number): Promise<void> {
    if (current.role === "super_admin") return;
    const target = await this.repo.findById(targetId);
    if (!target || !this.managedRoles(current.role).includes(target.rol)) throw this.forbidden();
    if (target.rol === "encargado_visita") {
      const targetSedes = await this.sedeAccess.listAuthorizedSedes(targetId);
      const allowed = await this.sedeAccess.resolveSedeIds(current) ?? [];
      if (targetSedes.length === 0 || targetSedes.some((sede) => !allowed.includes(sede.id))) throw this.forbidden();
      return;
    }
    const assignment = await this.repo.findActivePorteriaAssignment(targetId);
    if (!assignment) throw this.forbidden();
    if (current.role === "encargado_seguridad" || current.role === "encargado_porteria") {
      if (Number(assignment.empresa_seguridad_id) !== current.empresaSeguridadId) throw this.forbidden();
      return;
    }
    const allowed = await this.sedeAccess.resolveSedeIds(current) ?? [];
    if (assignment.sede_id == null || !allowed.includes(Number(assignment.sede_id))) throw this.forbidden();
  }
  private managedRoles(role: UserRole): UserRole[] {
    return getManagedRoles(role);
  }
  private async assertAssignmentTarget(current: AuthenticatedUser | undefined, empresaSeguridadId: number, sedeAssignmentId?: number): Promise<void> {
    if (sedeAssignmentId == null) {
      if (!await this.repo.securityCompanyExists(empresaSeguridadId)) throw this.forbidden();
      if (current && current.role !== "super_admin") throw this.forbidden();
      return;
    }
    const targetSede = await this.repo.findPorteriaTarget(sedeAssignmentId, empresaSeguridadId);
    if (!targetSede) throw this.forbidden();
    if (!current || current.role === "super_admin") return;
    if (current.role === "encargado_seguridad" || current.role === "encargado_porteria") {
      const allowed = await this.sedeAccess.listSecurityCompanySedeIds(current.empresaSeguridadId);
      if (current.empresaSeguridadId !== empresaSeguridadId || !allowed.includes(targetSede)) throw this.forbidden();
      return;
    }
    await this.sedeAccess.assertSede(current, targetSede);
  }
  private forbidden(): BusinessException { return new BusinessException({ message: "No tiene permiso para administrar este usuario", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN }); }
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
