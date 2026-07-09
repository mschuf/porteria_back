/**
 * @file empresas.service.ts
 * @description Orquesta el CRUD de empresas contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { CreateEmpresaInput, UpdateEmpresaInput } from "./empresas.types";
import type { EmpresaResponseDto } from "./dto/empresa.response.dto";
import { CreateEmpresaDto } from "./dto/create-empresa.dto";
import {
  DEFAULT_EMPRESAS_PAGE_LIMIT,
  type ListEmpresasQueryDto,
} from "./dto/list-empresas-query.dto";
import { UpdateEmpresaDto } from "./dto/update-empresa.dto";
import { mapEmpresaRowToResponse } from "./mappers/empresa.mapper";
import { EmpresasSqlRepository } from "./repositories/empresas.sql-repository";

/** Servicio de gestion de empresas con persistencia en Postgres. */
@Injectable()
export class EmpresasService {
  /** Inyecta el repositorio de empresas. */
  constructor(private readonly repo: EmpresasSqlRepository) {}

  /** Lista empresas paginadas aplicando busqueda y filtros. */
  async list(query: ListEmpresasQueryDto): Promise<PaginatedResult<EmpresaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_EMPRESAS_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      nombre: query.nombre,
      ruc: query.ruc,
      direccion: query.direccion,
      telefono: query.telefono,
      correo: query.correo,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapEmpresaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una empresa por su identificador. */
  async findById(id: number): Promise<EmpresaResponseDto> {
    const empresa = await this.repo.findById(id);
    if (!empresa) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaRowToResponse(empresa);
  }

  /** Crea una empresa nueva. */
  async create(dto: CreateEmpresaDto): Promise<EmpresaResponseDto> {
    const nombre = dto.nombre.trim();
    const ruc = normalizeRequiredText(dto.ruc, "RUC");
    const direccion = normalizeRequiredText(dto.direccion, "Direccion");
    const telefono = normalizeRequiredText(dto.telefono, "Telefono");
    const correo = normalizeRequiredText(dto.correo, "Correo");
    this.assertRequiredText(nombre, "Nombre");
    await this.ensureUniqueRuc(ruc);

    const input: CreateEmpresaInput = {
      nombre,
      ruc,
      direccion,
      telefono,
      correo,
      activo: dto.activo ?? true,
    };

    const created = await this.repo.create(input);
    return mapEmpresaRowToResponse(created);
  }

  /** Actualiza parcialmente una empresa existente. */
  async update(id: number, dto: UpdateEmpresaDto): Promise<EmpresaResponseDto> {
    await this.ensureExists(id);

    const nombre = dto.nombre !== undefined ? dto.nombre.trim() : undefined;
    if (nombre !== undefined) {
      this.assertRequiredText(nombre, "Nombre");
    }

    const ruc = dto.ruc !== undefined ? normalizeOptionalText(dto.ruc) : undefined;
    if (ruc !== undefined) {
      await this.ensureUniqueRuc(ruc, id);
    }

    const input: UpdateEmpresaInput = {};
    if (nombre !== undefined) input.nombre = nombre;
    if (ruc !== undefined) input.ruc = ruc;
    if (dto.direccion !== undefined) input.direccion = normalizeOptionalText(dto.direccion);
    if (dto.telefono !== undefined) input.telefono = normalizeOptionalText(dto.telefono);
    if (dto.correo !== undefined) input.correo = normalizeOptionalText(dto.correo);
    if (dto.activo !== undefined) input.activo = dto.activo;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaRowToResponse(updated);
  }

  /** Desactiva una empresa. */
  async deactivate(id: number): Promise<EmpresaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaRowToResponse(updated);
  }

  /** Reactiva una empresa. */
  async activate(id: number): Promise<EmpresaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaRowToResponse(updated);
  }

  /** Elimina permanentemente una empresa sin sedes ni usuarios asociados. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const blockingRelations = await this.repo.countBlockingRelations(id);
    if (blockingRelations > 0) {
      throw new BusinessException({
        message: `No se puede eliminar la empresa ${id} porque tiene sedes o usuarios asociados`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { id: deletedId, deleted: true };
  }

  /** Verifica que una empresa exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const empresa = await this.repo.findById(id);
    if (!empresa) {
      throw new BusinessException({
        message: `Empresa ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  /** Verifica unicidad de RUC cuando se informa un valor no vacio. */
  private async ensureUniqueRuc(ruc: string | null, currentId?: number): Promise<void> {
    if (!ruc) return;

    const existing = await this.repo.findByRuc(ruc);
    if (existing && Number(existing.id) !== currentId) {
      throw new BusinessException({
        message: `Ya existe una empresa con RUC ${ruc}`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
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

function normalizeRequiredText(value: string, label: string): string {
  const trimmed = value.trim();
  assertRequiredText(trimmed, label);
  return trimmed;
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
