/**
 * @file usuarios-admin.service.ts
 * @description Orquesta el CRUD de usuarios contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
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

    if (usuario.rol === "admin_empresa") {
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
              id: Number(asignacion.empresa_porteria_id),
              nombre: asignacion.empresa_porteria_nombre,
            },
            sede: {
              id: Number(asignacion.sede_id),
              nombre: asignacion.sede_nombre,
            },
            empresa: {
              id: Number(asignacion.empresa_id),
              nombre: asignacion.empresa_nombre,
            },
          }
        : null,
    };
  }

  /** Define el conjunto completo de sedes de un administrador. */
  async replaceSedes(id: number, sedeIds: number[]): Promise<void> {
    const usuario = await this.repo.findById(id);
    if (!usuario) throw this.notFound(id);
    if (usuario.rol !== "admin_empresa") {
      throw new BusinessException({ message: "Solo se pueden asignar sedes a admin_empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    const companies = await this.repo.findSedeCompanyIds(sedeIds);
    if (companies.size !== (sedeIds.length ? 1 : 0) || companies.missing) {
      throw new BusinessException({ message: "Las sedes deben existir, estar activas y pertenecer a la misma empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    await this.repo.replaceActiveSedes(id, sedeIds);
  }

  async listPorteriaCandidates(current: AuthenticatedUser, search?: string) {
    const rows = await this.repo.findPorteriaCandidates(await this.sedeAccess.resolveSedeIds(current), search);
    return rows.map((r) => ({ id:Number(r.id), empresaPorteriaId:Number(r.empresa_porteria_id), sedeId:Number(r.sede_id), label:`${r.sede_nombre} — ${r.empresa_porteria_nombre}` }));
  }

  /** Crea un usuario nuevo con contraseña hasheada. */
  async create(dto: CreateUsuarioAdminDto, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current?.role === "admin_empresa" && dto.rol !== "portero") throw this.forbidden();
    if (dto.porteriaAssignment && dto.rol !== "portero") {
      throw new BusinessException({ message: "La asignacion de porteria solo corresponde a porteros", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (dto.sedeIds !== undefined && dto.rol !== "admin_empresa") {
      throw new BusinessException({ message: "Las sedes solo pueden asignarse a admin_empresa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }
    if (current?.role === "admin_empresa" && !dto.porteriaAssignment) {
      throw new BusinessException({ message: "La asignacion de porteria es obligatoria", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
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
      created = await this.repo.createWithSedes(input, dto.sedeIds);
    } else if (dto.porteriaAssignment) {
      const targetSede = await this.repo.findPorteriaTarget(dto.porteriaAssignment.sedeEmpresaPorteriaId, dto.porteriaAssignment.empresaPorteriaId);
      if (!targetSede) throw new BusinessException({ message: "La asignacion de porteria no esta activa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
      if (current) await this.sedeAccess.assertSede(current, targetSede);
      created = await this.repo.createWithPorteriaAssignment(input, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId);
    } else created = await this.repo.create(input);
    return mapUsuarioAdminRowToResponse(created);
  }

  /** Actualiza parcialmente un usuario existente. */
  async update(id: number, dto: UpdateUsuarioAdminDto, current?: AuthenticatedUser): Promise<UsuarioAdminResponseDto> {
    if (current) await this.assertActorCanManage(current, id);
    if (current?.role === "admin_empresa" && dto.rol !== undefined && dto.rol !== "portero") throw this.forbidden();
    const existing = await this.repo.findById(id);
    if (!existing) throw this.notFound(id);
    if (dto.porteriaAssignment && (dto.rol ?? existing.rol) !== "portero") {
      throw new BusinessException({ message: "La asignacion de porteria solo corresponde a porteros", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
    }

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
      const targetSede = await this.repo.findPorteriaTarget(dto.porteriaAssignment.sedeEmpresaPorteriaId, dto.porteriaAssignment.empresaPorteriaId);
      if (!targetSede) throw new BusinessException({ message: "La asignacion de porteria no esta activa", code: API_ERROR_CODE.VALIDATION, status: HttpStatus.BAD_REQUEST });
      if (current) await this.sedeAccess.assertSede(current, targetSede);
      updated = await this.repo.updateWithPorteriaAssignment(id, input, dto.porteriaAssignment.empresaPorteriaId, dto.porteriaAssignment.sedeEmpresaPorteriaId);
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
    if (!target || target.rol !== "portero") throw this.forbidden();
    const assignment = await this.repo.findActivePorteriaAssignment(targetId);
    const allowed = await this.sedeAccess.resolveSedeIds(current) ?? [];
    if (!assignment || !allowed.includes(Number(assignment.sede_id))) throw this.forbidden();
  }
  private forbidden(): BusinessException { return new BusinessException({ message: "No tiene permiso para administrar este usuario", code: API_ERROR_CODE.FORBIDDEN, status: HttpStatus.FORBIDDEN }); }
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
