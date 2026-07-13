/**
 * @file sedes.service.ts
 * @description Orquesta el CRUD de sedes contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { CreateSedeInput, UpdateSedeInput } from "./sedes.types";
import type { SedeResponseDto } from "./dto/sede.response.dto";
import { CreateSedeDto } from "./dto/create-sede.dto";
import { DEFAULT_SEDES_PAGE_LIMIT, type ListSedesQueryDto } from "./dto/list-sedes-query.dto";
import { UpdateSedeDto } from "./dto/update-sede.dto";
import { mapSedeRowToResponse } from "./mappers/sede.mapper";
import { SedesSqlRepository } from "./repositories/sedes.sql-repository";

/** Servicio de gestion de sedes con persistencia en Postgres. */
@Injectable()
export class SedesService {
  /** Inyecta el repositorio de sedes. */
  constructor(private readonly repo: SedesSqlRepository) {}

  /** Lista sedes paginadas aplicando busqueda y filtros. */
  async list(query: ListSedesQueryDto): Promise<PaginatedResult<SedeResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_SEDES_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      nombre: query.nombre,
      direccion: query.direccion,
      telefono: query.telefono,
      empresaId: query.empresaId,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapSedeRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una sede por su identificador. */
  async findById(id: number): Promise<SedeResponseDto> {
    const sede = await this.repo.findById(id);
    if (!sede) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeRowToResponse(sede);
  }

  /** Crea una sede nueva. */
  async create(dto: CreateSedeDto): Promise<SedeResponseDto> {
    const nombre = dto.nombre.trim();
    this.assertRequiredText(nombre, "Nombre");
    await this.ensureEmpresaExists(dto.empresaId);

    const input: CreateSedeInput = {
      empresaId: dto.empresaId,
      nombre,
      direccion: normalizeOptionalText(dto.direccion),
      telefono: normalizeOptionalText(dto.telefono),
      activo: dto.activo ?? true,
    };

    const created = await this.repo.create(input);
    return mapSedeRowToResponse(created);
  }

  /** Actualiza parcialmente una sede existente. */
  async update(id: number, dto: UpdateSedeDto): Promise<SedeResponseDto> {
    await this.ensureExists(id);

    const nombre = dto.nombre !== undefined ? dto.nombre.trim() : undefined;
    if (nombre !== undefined) {
      this.assertRequiredText(nombre, "Nombre");
    }

    if (dto.empresaId !== undefined) {
      await this.ensureEmpresaExists(dto.empresaId);
    }

    const input: UpdateSedeInput = {};
    if (dto.empresaId !== undefined) input.empresaId = dto.empresaId;
    if (nombre !== undefined) input.nombre = nombre;
    if (dto.direccion !== undefined) input.direccion = normalizeOptionalText(dto.direccion);
    if (dto.telefono !== undefined) input.telefono = normalizeOptionalText(dto.telefono);
    if (dto.activo !== undefined) input.activo = dto.activo;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeRowToResponse(updated);
  }

  /** Desactiva una sede. */
  async deactivate(id: number): Promise<SedeResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeRowToResponse(updated);
  }

  /** Reactiva una sede. */
  async activate(id: number): Promise<SedeResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapSedeRowToResponse(updated);
  }

  /** Elimina permanentemente una sede sin asignaciones de portería activas. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const blockingRelations = await this.repo.countBlockingRelations(id);
    if (blockingRelations > 0) {
      throw new BusinessException({
        message: `No se puede eliminar la sede ${id} porque tiene asignaciones, áreas o tarjetas asociadas`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { id: deletedId, deleted: true };
  }

  /** Verifica que una sede exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const sede = await this.repo.findById(id);
    if (!sede) {
      throw new BusinessException({
        message: `Sede ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
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

  /** Rechaza campos obligatorios vacios despues de normalizar espacios. */
  private assertRequiredText(value: string, label: string): void {
    assertRequiredText(value, label);
  }
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertRequiredText(value: string, label: string): void {
  if (!value) {
    throw new BusinessException({
      message: `${label} es obligatorio`,
      code: API_ERROR_CODE.VALIDATION,
      status: HttpStatus.BAD_REQUEST,
    });
  }
}
