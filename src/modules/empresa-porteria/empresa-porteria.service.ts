/**
 * @file empresa-porteria.service.ts
 * @description Orquesta el CRUD de empresas de porteria contra Postgres y aplica reglas de negocio.
 */
import { HttpStatus, Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../common/dto/pagination.dto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import type { CreateEmpresaPorteriaInput, UpdateEmpresaPorteriaInput } from "./empresa-porteria.types";
import type { EmpresaPorteriaResponseDto } from "./dto/empresa-porteria.response.dto";
import { CreateEmpresaPorteriaDto } from "./dto/create-empresa-porteria.dto";
import {
  DEFAULT_EMPRESA_PORTERIA_PAGE_LIMIT,
  type ListEmpresaPorteriaQueryDto,
} from "./dto/list-empresa-porteria-query.dto";
import { UpdateEmpresaPorteriaDto } from "./dto/update-empresa-porteria.dto";
import { mapEmpresaPorteriaRowToResponse } from "./mappers/empresa-porteria.mapper";
import { EmpresaPorteriaSqlRepository } from "./repositories/empresa-porteria.sql-repository";

/** Servicio de gestion de empresas de porteria con persistencia en Postgres. */
@Injectable()
export class EmpresaPorteriaService {
  /** Inyecta el repositorio de empresas de porteria. */
  constructor(private readonly repo: EmpresaPorteriaSqlRepository) {}

  /** Lista empresas de porteria paginadas aplicando busqueda y filtros. */
  async list(
    query: ListEmpresaPorteriaQueryDto,
  ): Promise<PaginatedResult<EmpresaPorteriaResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_EMPRESA_PORTERIA_PAGE_LIMIT;
    const result = await this.repo.findAll({
      page,
      limit,
      search: query.search,
      nombre: query.nombre,
      ruc: query.ruc,
      telefono: query.telefono,
      correo: query.correo,
      nombreContacto: query.nombreContacto,
      telefonoContacto: query.telefonoContacto,
      correoContacto: query.correoContacto,
      activo: query.activo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items: result.items.map(mapEmpresaPorteriaRowToResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /** Obtiene una empresa de seguridad por su identificador. */
  async findById(id: number): Promise<EmpresaPorteriaResponseDto> {
    const empresaPorteria = await this.repo.findById(id);
    if (!empresaPorteria) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaPorteriaRowToResponse(empresaPorteria);
  }

  /** Crea una empresa de seguridad nueva. */
  async create(dto: CreateEmpresaPorteriaDto): Promise<EmpresaPorteriaResponseDto> {
    const nombre = dto.nombre.trim();
    const ruc = normalizeRequiredText(dto.ruc, "RUC");
    const telefono = normalizeRequiredText(dto.telefono, "Telefono");
    const correo = normalizeRequiredText(dto.correo, "Correo");
    this.assertRequiredText(nombre, "Nombre");
    await this.ensureUniqueRuc(ruc);

    const input: CreateEmpresaPorteriaInput = {
      nombre,
      ruc,
      telefono,
      correo,
      nombreContacto: normalizeOptionalText(dto.nombreContacto),
      telefonoContacto: normalizeOptionalText(dto.telefonoContacto),
      correoContacto: normalizeOptionalText(dto.correoContacto),
      activo: dto.activo ?? true,
    };

    const created = await this.repo.create(input);
    return mapEmpresaPorteriaRowToResponse(created);
  }

  /** Actualiza parcialmente una empresa de seguridad existente. */
  async update(id: number, dto: UpdateEmpresaPorteriaDto): Promise<EmpresaPorteriaResponseDto> {
    await this.ensureExists(id);

    const nombre = dto.nombre !== undefined ? dto.nombre.trim() : undefined;
    if (nombre !== undefined) {
      this.assertRequiredText(nombre, "Nombre");
    }

    const ruc = dto.ruc !== undefined ? normalizeOptionalText(dto.ruc) : undefined;
    if (ruc !== undefined) {
      await this.ensureUniqueRuc(ruc, id);
    }

    const input: UpdateEmpresaPorteriaInput = {};
    if (nombre !== undefined) input.nombre = nombre;
    if (ruc !== undefined) input.ruc = ruc;
    if (dto.telefono !== undefined) input.telefono = normalizeOptionalText(dto.telefono);
    if (dto.correo !== undefined) input.correo = normalizeOptionalText(dto.correo);
    if (dto.nombreContacto !== undefined) input.nombreContacto = normalizeOptionalText(dto.nombreContacto);
    if (dto.telefonoContacto !== undefined) input.telefonoContacto = normalizeOptionalText(dto.telefonoContacto);
    if (dto.correoContacto !== undefined) input.correoContacto = normalizeOptionalText(dto.correoContacto);
    if (dto.activo !== undefined) input.activo = dto.activo;

    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaPorteriaRowToResponse(updated);
  }

  /** Desactiva una empresa de seguridad. */
  async deactivate(id: number): Promise<EmpresaPorteriaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.softDelete(id);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaPorteriaRowToResponse(updated);
  }

  /** Reactiva una empresa de seguridad. */
  async activate(id: number): Promise<EmpresaPorteriaResponseDto> {
    await this.ensureExists(id);
    const updated = await this.repo.activate(id);
    if (!updated) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return mapEmpresaPorteriaRowToResponse(updated);
  }

  /** Elimina permanentemente una empresa de seguridad sin sedes ni usuarios asociados. */
  async deletePermanent(id: number): Promise<{ id: number; deleted: true }> {
    await this.ensureExists(id);

    const blockingRelations = await this.repo.countBlockingRelations(id);
    if (blockingRelations > 0) {
      throw new BusinessException({
        message: `No se puede eliminar la empresa de seguridad ${id} porque tiene sedes o usuarios asociados`,
        code: API_ERROR_CODE.CONFLICT,
        status: HttpStatus.CONFLICT,
      });
    }

    const deletedId = await this.repo.hardDelete(id);
    if (deletedId == null) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
        code: API_ERROR_CODE.NOT_FOUND,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { id: deletedId, deleted: true };
  }

  /** Verifica que una empresa de seguridad exista antes de operaciones de escritura. */
  private async ensureExists(id: number): Promise<void> {
    const empresaPorteria = await this.repo.findById(id);
    if (!empresaPorteria) {
      throw new BusinessException({
        message: `Empresa de seguridad ${id} not found`,
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
        message: `Ya existe una empresa de seguridad con RUC ${ruc}`,
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
