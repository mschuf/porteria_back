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

/** Servicio de gestion de asignaciones usuario-empresa-porteria con persistencia en Postgres. */
@Injectable()
export class UsuarioEmpresaPorteriaService {
  /** Inyecta el repositorio de asignaciones usuario-empresa-porteria. */
  constructor(private readonly repo: UsuarioEmpresaPorteriaSqlRepository) {}

  /** Lista asignaciones usuario-empresa-porteria paginadas aplicando busqueda y filtros. */
  async list(query: ListUsuarioEmpresaPorteriaQueryDto): Promise<PaginatedResult<UsuarioEmpresaPorteriaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_USUARIO_EMPRESA_PORTERIA_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      usuarioId: query.usuarioId,
      empresaPorteriaId: query.empresaPorteriaId,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapUsuarioEmpresaPorteriaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una asignacion usuario-empresa-porteria por su identificador. */
  async findById(id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const asignacion = await this.repo.findById(id);
    if (!asignacion) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapUsuarioEmpresaPorteriaRowToResponse(asignacion);
  }

  /** Crea una asignacion usuario-empresa-porteria nueva. */
  async create(dto: CreateUsuarioEmpresaPorteriaDto): Promise<UsuarioEmpresaPorteriaResponseDto> {
    await this.ensureUsuarioExists(dto.usuarioId);
    await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);

    const activo = dto.activo ?? true;
    if (activo) {
      await this.ensureNoActiveDuplicate(dto.usuarioId, dto.empresaPorteriaId);
    }

    const input: CreateUsuarioEmpresaPorteriaInput = {
      usuarioId: dto.usuarioId,
      empresaPorteriaId: dto.empresaPorteriaId,
      activo,
    };

    const created = await this.repo.create(input);
    return mapUsuarioEmpresaPorteriaRowToResponse(created);
  }

  /** Actualiza parcialmente una asignacion usuario-empresa-porteria existente. */
  async update(id: number, dto: UpdateUsuarioEmpresaPorteriaDto): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    if (dto.usuarioId !== undefined) {
      await this.ensureUsuarioExists(dto.usuarioId);
    }
    if (dto.empresaPorteriaId !== undefined) {
      await this.ensureEmpresaPorteriaExists(dto.empresaPorteriaId);
    }

    const resultingUsuarioId = dto.usuarioId ?? Number(current.usuario_id);
    const resultingEmpresaPorteriaId = dto.empresaPorteriaId ?? Number(current.empresa_porteria_id);
    const resultingActivo = dto.activo ?? current.activo;

    if (resultingActivo) {
      await this.ensureNoActiveDuplicate(resultingUsuarioId, resultingEmpresaPorteriaId, id);
    }

    const input: UpdateUsuarioEmpresaPorteriaInput = {};
    if (dto.usuarioId !== undefined) input.usuarioId = dto.usuarioId;
    if (dto.empresaPorteriaId !== undefined) input.empresaPorteriaId = dto.empresaPorteriaId;
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
  async deactivate(id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    await this.ensureExists(id);
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
  async activate(id: number): Promise<UsuarioEmpresaPorteriaResponseDto> {
    const current = await this.repo.findById(id);
    if (!current) {
      throw new BusinessException({
        message: `Asignacion usuario-empresa-porteria ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await this.ensureNoActiveDuplicate(Number(current.usuario_id), Number(current.empresa_porteria_id), id);

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

  /** Verifica que la empresa de porteria referenciada exista. */
  private async ensureEmpresaPorteriaExists(empresaPorteriaId: number): Promise<void> {
    const exists = await this.repo.empresaPorteriaExists(empresaPorteriaId);
    if (!exists) {
      throw new BusinessException({
        message: `Empresa de porteria ${empresaPorteriaId} not found`,
        code: API_ERROR_CODE.VALIDATION,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  /** Verifica que no exista ya otra asignacion activa para el mismo par usuario-empresa_porteria. */
  private async ensureNoActiveDuplicate(
    usuarioId: number,
    empresaPorteriaId: number,
    excludeId?: number,
  ): Promise<void> {
    const existingId = await this.repo.findActiveDuplicate(usuarioId, empresaPorteriaId, excludeId);
    if (existingId != null) {
      throw new BusinessException({
        message: `El usuario ${usuarioId} ya tiene una asignacion activa con la empresa de porteria ${empresaPorteriaId}`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }
  }
}
