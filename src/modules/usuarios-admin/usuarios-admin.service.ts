/**
 * @file usuarios-admin.service.ts
 * @description Orquesta el CRUD de usuarios contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
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

const BCRYPT_SALT_ROUNDS = 10;

/** Servicio de gestion de usuarios con persistencia en Postgres. */
@Injectable()
export class UsuariosAdminService {
  /** Inyecta el repositorio de usuarios. */
  constructor(private readonly repo: UsuariosAdminSqlRepository) {}

  /** Lista usuarios paginados aplicando busqueda y filtros. */
  async list(query: ListUsuariosAdminQueryDto): Promise<PaginatedResult<UsuarioAdminResponseDto>> {
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
    });

    return {
      items: result.items.map(mapUsuarioAdminRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene un usuario por su identificador. */
  async findById(id: number): Promise<UsuarioAdminResponseDto> {
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(usuario);
  }

  /** Explica las relaciones vigentes que determinan el acceso del usuario según su rol. */
  async explainAssignment(id: number): Promise<UsuarioAdminAsignacionResponseDto> {
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
      const empresas = await this.repo.findActiveEmpresaAssignments(id);
      return {
        tipo: "empresa",
        usuario: usuarioDto,
        empresas: empresas.map((empresa) => ({
          id: Number(empresa.empresa_id),
          nombre: empresa.empresa_nombre,
        })),
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

  /** Crea un usuario nuevo con contraseña hasheada. */
  async create(dto: CreateUsuarioAdminDto): Promise<UsuarioAdminResponseDto> {
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

    const created = await this.repo.create(input);
    return mapUsuarioAdminRowToResponse(created);
  }

  /** Actualiza parcialmente un usuario existente. */
  async update(id: number, dto: UpdateUsuarioAdminDto): Promise<UsuarioAdminResponseDto> {
    await this.ensureExists(id);

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

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Restablece la contraseña de un usuario existente. */
  async resetPassword(id: number, password: string): Promise<UsuarioAdminResponseDto> {
    await this.ensureExists(id);

    const contrasenaHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const updated = await this.repo.updatePassword(id, contrasenaHash);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Desactiva un usuario. Rechaza que el usuario autenticado se desactive a si mismo. */
  async deactivate(id: number, currentUserId: number): Promise<UsuarioAdminResponseDto> {
    if (id === currentUserId) {
      throw new BusinessException({
        message: "No puede desactivar su propio usuario",
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    await this.ensureExists(id);
    const updated = await this.repo.setActivo(id, false);
    if (!updated) {
      throw this.notFound(id);
    }

    return mapUsuarioAdminRowToResponse(updated);
  }

  /** Reactiva un usuario. */
  async activate(id: number): Promise<UsuarioAdminResponseDto> {
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
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
