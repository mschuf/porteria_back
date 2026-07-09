/**
 * @file usuario-empresa.service.ts
 * @description Orquesta el CRUD de asignaciones usuario-empresa contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { CreateUsuarioEmpresaInput, UpdateUsuarioEmpresaInput } from "./usuario-empresa.types";
import type { UsuarioEmpresaResponseDto } from "./dto/usuario-empresa.response.dto";
import { CreateUsuarioEmpresaDto } from "./dto/create-usuario-empresa.dto";
import {
  DEFAULT_USUARIO_EMPRESA_PAGE_LIMIT,
  type ListUsuarioEmpresaQueryDto,
} from "./dto/list-usuario-empresa-query.dto";
import { UpdateUsuarioEmpresaDto } from "./dto/update-usuario-empresa.dto";
import { mapUsuarioEmpresaRowToResponse } from "./mappers/usuario-empresa.mapper";
import { UsuarioEmpresaSqlRepository } from "./repositories/usuario-empresa.sql-repository";

/** Servicio de gestion de asignaciones usuario-empresa con persistencia en Postgres. */
@Injectable()
export class UsuarioEmpresaService {
  /** Inyecta el repositorio de asignaciones usuario-empresa. */
  constructor(private readonly repo: UsuarioEmpresaSqlRepository) {}

  /** Lista asignaciones usuario-empresa paginadas aplicando busqueda y filtros. */
  async list(query: ListUsuarioEmpresaQueryDto): Promise<PaginatedResult<UsuarioEmpresaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_USUARIO_EMPRESA_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      usuarioId: query.usuarioId,
      empresaId: query.empresaId,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapUsuarioEmpresaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una asignacion usuario-empresa por su identificador. */
  async findById(id: number): Promise<UsuarioEmpresaResponseDto> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaRowToResponse(asignacion);
  }

  /** Crea una asignacion usuario-empresa nueva. */
  async create(dto: CreateUsuarioEmpresaDto): Promise<UsuarioEmpresaResponseDto> {
    await this.ensureUsuarioExists(dto.usuarioId);
    await this.ensureEmpresaExists(dto.empresaId);

    const activo = dto.activo ?? true;
    if (activo) {
      await this.ensureNoActiveDuplicate(dto.usuarioId, dto.empresaId);
    }

    const input: CreateUsuarioEmpresaInput = {
      usuarioId: dto.usuarioId,
      empresaId: dto.empresaId,
      activo,
    };

    const created = await this.repo.create(input);
    return mapUsuarioEmpresaRowToResponse(created);
  }

  /** Actualiza parcialmente una asignacion usuario-empresa existente. */
  async update(id: number, dto: UpdateUsuarioEmpresaDto): Promise<UsuarioEmpresaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.usuarioId !== undefined) {
      await this.ensureUsuarioExists(dto.usuarioId);
    }
    if (dto.empresaId !== undefined) {
      await this.ensureEmpresaExists(dto.empresaId);
    }

    const resultingUsuarioId = dto.usuarioId ?? Number(current.usuario_id);
    const resultingEmpresaId = dto.empresaId ?? Number(current.empresa_id);
    const resultingActivo = dto.activo ?? current.activo;

    if (resultingActivo) {
      await this.ensureNoActiveDuplicate(resultingUsuarioId, resultingEmpresaId, id);
    }

    const input: UpdateUsuarioEmpresaInput = {};
    if (dto.usuarioId !== undefined) input.usuarioId = dto.usuarioId;
    if (dto.empresaId !== undefined) input.empresaId = dto.empresaId;
    if (dto.activo !== undefined) input.activo = dto.activo;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaRowToResponse(updated);
  }

  /** Desactiva una asignacion usuario-empresa. */
  async deactivate(id: number): Promise<UsuarioEmpresaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaRowToResponse(updated);
  }

  /** Reactiva una asignacion usuario-empresa. */
  async activate(id: number): Promise<UsuarioEmpresaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await this.ensureNoActiveDuplicate(Number(current.usuario_id), Number(current.empresa_id), id);

    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaRowToResponse(updated);
  }

  /** Elimina permanentemente una asignacion usuario-empresa. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa ${id} not found`,
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
        message: `Asignacion usuario-empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
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

  /** Verifica que la empresa referenciada exista. */
  private async ensureEmpresaExists(empresaId: number): Promise<void> {
    const exists = await this.repo.empresaExists(empresaId);
    if (!exists) {
      throw new BusinessException({
        message: `Empresa ${empresaId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que no exista ya otra asignacion activa para el mismo par usuario-empresa. */
  private async ensureNoActiveDuplicate(usuarioId: number, empresaId: number, excludeId?: number): Promise<void> {
    const existingId = await this.repo.findActiveDuplicate(usuarioId, empresaId, excludeId);
    if (existingId != null) {
      throw new BusinessException({
        message: `El usuario ${usuarioId} ya tiene una asignacion activa con la empresa ${empresaId}`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }
}
